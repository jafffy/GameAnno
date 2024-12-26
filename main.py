import sys
import cv2
import json
import os
from pathlib import Path
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                            QHBoxLayout, QPushButton, QLabel, QFileDialog, 
                            QSpinBox, QDialog, QComboBox, QCheckBox, QLineEdit,
                            QListWidget, QScrollArea, QMessageBox)
from PyQt6.QtCore import Qt, QRect, QPoint
from PyQt6.QtGui import QImage, QPixmap, QPainter, QPen, QColor
import numpy as np
import datetime
from config import INTERACTION_CATEGORIES, INTERACTION_TYPES

class AnnotationDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Annotation Details")
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout()

        # Category selection
        self.category_combo = QComboBox()
        self.category_combo.addItems(INTERACTION_CATEGORIES)
        layout.addWidget(QLabel("Category:"))
        layout.addWidget(self.category_combo)

        # Interactive checkbox
        self.interactive_check = QCheckBox("Is Interactive?")
        layout.addWidget(self.interactive_check)

        # Interaction types
        self.interaction_list = QListWidget()
        self.interaction_list.addItems(INTERACTION_TYPES)
        self.interaction_list.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
        layout.addWidget(QLabel("Interaction Types:"))
        layout.addWidget(self.interaction_list)

        # Notes
        self.notes_edit = QLineEdit()
        layout.addWidget(QLabel("Notes:"))
        layout.addWidget(self.notes_edit)

        # OK/Cancel buttons
        buttons_layout = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Cancel")
        ok_button.clicked.connect(self.accept)
        cancel_button.clicked.connect(self.reject)
        buttons_layout.addWidget(ok_button)
        buttons_layout.addWidget(cancel_button)
        layout.addLayout(buttons_layout)

        self.setLayout(layout)

class AnnotationCanvas(QLabel):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.drawing = False
        self.start_point = QPoint()
        self.end_point = QPoint()
        self.current_box = None
        self.boxes = []
        self.metadata = []
        self.scale_factor = 1.0
        self.setMouseTracking(True)

    def set_scale_factor(self, scale):
        self.scale_factor = scale

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.drawing = True
            pos = event.pos()
            # Get position relative to the actual image
            if self.pixmap():
                img_rect = self.get_image_rect()
                if img_rect.contains(pos):
                    self.start_point = QPoint(pos.x() - img_rect.x(), pos.y() - img_rect.y())
                    self.end_point = self.start_point
            self.current_box = None

    def mouseMoveEvent(self, event):
        if self.drawing and self.pixmap():
            pos = event.pos()
            img_rect = self.get_image_rect()
            if img_rect.contains(pos):
                self.end_point = QPoint(pos.x() - img_rect.x(), pos.y() - img_rect.y())
                self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton and self.drawing:
            self.drawing = False
            if self.start_point != self.end_point and self.pixmap():
                dialog = AnnotationDialog(self)
                if dialog.exec():
                    box_id = f"box_{len(self.boxes) + 1}"
                    box = QRect(self.start_point, self.end_point).normalized()
                    self.boxes.append(box)
                    
                    metadata = {
                        "bounding_box_id": box_id,
                        "coordinates": [box.x(), box.y(), box.x() + box.width(), box.y() + box.height()],
                        "category": dialog.category_combo.currentText(),
                        "is_interactive": dialog.interactive_check.isChecked(),
                        "interaction_type": [item.text() for item in dialog.interaction_list.selectedItems()],
                        "notes": dialog.notes_edit.text()
                    }
                    self.metadata.append(metadata)
                    # Set unsaved changes flag in parent window
                    main_window = self.window()
                    if isinstance(main_window, MainWindow):
                        main_window.has_unsaved_changes = True
                    self.update()

    def get_image_rect(self):
        """Get the rectangle of the actual image within the label."""
        if not self.pixmap():
            return QRect()
        
        # Get the scaled size of the pixmap
        scaled_size = self.pixmap().size()
        
        # Calculate position to center the image
        pos = QPoint(0, 0)
        if self.width() > scaled_size.width():
            pos.setX((self.width() - scaled_size.width()) // 2)
        if self.height() > scaled_size.height():
            pos.setY((self.height() - scaled_size.height()) // 2)
            
        return QRect(pos, scaled_size)

    def paintEvent(self, event):
        super().paintEvent(event)
        if self.pixmap():
            painter = QPainter(self)
            painter.setPen(QPen(QColor(255, 0, 0), 2, Qt.PenStyle.SolidLine))
            
            # Get the image rectangle
            img_rect = self.get_image_rect()
            
            # Draw existing boxes
            for box in self.boxes:
                # Adjust box position relative to image position
                adjusted_box = QRect(
                    box.x() + img_rect.x(),
                    box.y() + img_rect.y(),
                    box.width(),
                    box.height()
                )
                painter.drawRect(adjusted_box)

            # Draw current box
            if self.drawing:
                adjusted_box = QRect(
                    self.start_point.x() + img_rect.x(),
                    self.start_point.y() + img_rect.y(),
                    self.end_point.x() - self.start_point.x(),
                    self.end_point.y() - self.start_point.y()
                ).normalized()
                painter.drawRect(adjusted_box)

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GameAnno - Video Game Annotation Tool")
        self.has_unsaved_changes = False
        self.setup_ui()
        self.current_frame = None
        self.cap = None
        self.frame_count = 0
        self.current_frame_number = 0
        self.is_image = False
        self.original_size = (0, 0)  # Track original image size

    def setup_ui(self):
        # Main widget and layout
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)

        # Top controls
        top_controls = QHBoxLayout()
        
        # File loading buttons
        file_buttons = QHBoxLayout()
        self.load_video_button = QPushButton("Load Video")
        self.load_image_button = QPushButton("Load Image")
        self.load_video_button.clicked.connect(self.load_video)
        self.load_image_button.clicked.connect(self.load_image)
        file_buttons.addWidget(self.load_video_button)
        file_buttons.addWidget(self.load_image_button)
        top_controls.addLayout(file_buttons)

        # Frame navigation (only for videos)
        self.frame_controls = QHBoxLayout()
        self.frame_spin = QSpinBox()
        self.frame_spin.setEnabled(False)
        self.frame_spin.valueChanged.connect(self.go_to_frame)
        self.frame_controls.addWidget(QLabel("Frame:"))
        self.frame_controls.addWidget(self.frame_spin)
        top_controls.addLayout(self.frame_controls)

        layout.addLayout(top_controls)

        # Annotation canvas
        scroll_area = QScrollArea()
        self.canvas = AnnotationCanvas(self)  # Set MainWindow as parent
        self.canvas.setAlignment(Qt.AlignmentFlag.AlignCenter)
        scroll_area.setWidget(self.canvas)
        scroll_area.setWidgetResizable(True)
        layout.addWidget(scroll_area)

        # Bottom controls
        bottom_controls = QHBoxLayout()
        self.prev_button = QPushButton("Previous Frame")
        self.next_button = QPushButton("Next Frame")
        self.export_button = QPushButton("Export")
        
        self.prev_button.clicked.connect(self.prev_frame)
        self.next_button.clicked.connect(self.next_frame)
        self.export_button.clicked.connect(self.export_annotations)
        
        self.prev_button.setEnabled(False)
        self.next_button.setEnabled(False)
        self.export_button.setEnabled(False)

        bottom_controls.addWidget(self.prev_button)
        bottom_controls.addWidget(self.next_button)
        bottom_controls.addWidget(self.export_button)
        layout.addLayout(bottom_controls)

        self.setMinimumSize(800, 600)

    def load_video(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Open Video File", "", 
                                                 "Video Files (*.mp4 *.avi *.mkv)")
        if file_name:
            self.is_image = False
            self.cap = cv2.VideoCapture(file_name)
            self.frame_count = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
            self.frame_spin.setRange(0, self.frame_count - 1)
            self.frame_spin.setEnabled(True)
            self.prev_button.setEnabled(True)
            self.next_button.setEnabled(True)
            self.export_button.setEnabled(True)
            self.current_frame_number = 0
            self.show_frame()

    def load_image(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Open Image File", "",
                                                 "Image Files (*.png *.jpg *.jpeg *.bmp)")
        if file_name:
            self.is_image = True
            # Disable video-specific controls
            self.frame_spin.setEnabled(False)
            self.prev_button.setEnabled(False)
            self.next_button.setEnabled(False)
            # Enable export
            self.export_button.setEnabled(True)
            
            # Load and display the image
            self.current_frame = cv2.imread(file_name)
            if self.current_frame is not None:
                self.show_frame()

    def show_frame(self):
        if self.is_image:
            frame = self.current_frame
        else:
            if self.cap is None:
                return
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, self.current_frame_number)
            ret, frame = self.cap.read()
            if not ret:
                return
            self.current_frame = frame

        # Store original size
        self.original_size = frame.shape[:2]  # (height, width)
        
        # Calculate resize dimensions to fit within 720p while maintaining aspect ratio
        h, w = frame.shape[:2]
        target_height = 720
        target_width = 1280
        
        # Calculate scaling factor to fit within 720p bounds
        scale_w = target_width / w
        scale_h = target_height / h
        scale = min(scale_w, scale_h)
        
        # Store scale factor in canvas
        self.canvas.set_scale_factor(scale)
        
        # Calculate new dimensions
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        # Resize frame
        self.resized_frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        # Convert to RGB for Qt
        frame_rgb = cv2.cvtColor(self.resized_frame, cv2.COLOR_BGR2RGB)
        h, w, ch = frame_rgb.shape
        bytes_per_line = ch * w
        qt_image = QImage(frame_rgb.data, w, h, bytes_per_line, QImage.Format.Format_RGB888)
        self.canvas.setPixmap(QPixmap.fromImage(qt_image))
        self.canvas.boxes = []
        self.canvas.metadata = []
        self.has_unsaved_changes = False

    def prev_frame(self):
        if self.current_frame_number > 0:
            self.current_frame_number -= 1
            self.show_frame()

    def next_frame(self):
        if self.current_frame_number < self.frame_count - 1:
            self.current_frame_number += 1
            self.show_frame()

    def go_to_frame(self, frame_number):
        if 0 <= frame_number < self.frame_count:
            self.current_frame_number = frame_number
            self.show_frame()

    def export_annotations(self):
        if not self.current_frame is None and len(self.canvas.metadata) > 0:
            # Create timestamped export directory
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            export_dir = Path("exports") / timestamp
            export_dir.mkdir(parents=True, exist_ok=True)

            # Generate scene_id
            if self.is_image:
                scene_id = "scene_001"
            else:
                scene_id = f"scene_001_frame_{self.current_frame_number:03d}"
            
            # Save resized original frame
            original_path = export_dir / f"{scene_id}_original.png"
            cv2.imwrite(str(original_path), self.resized_frame)

            # Save annotated frame
            annotated_frame = self.resized_frame.copy()
            
            # Draw annotations on the resized frame
            for metadata in self.canvas.metadata:
                coords = metadata["coordinates"]
                # Draw rectangle using the stored coordinates
                cv2.rectangle(annotated_frame, 
                            (int(coords[0]), int(coords[1])), 
                            (int(coords[2]), int(coords[3])),
                            (0, 0, 255), 2)
            
            annotated_path = export_dir / f"{scene_id}_annotated.png"
            cv2.imwrite(str(annotated_path), annotated_frame)

            # Save metadata with the display-scale coordinates
            metadata = {
                "scene_id": scene_id,
                "timestamp": timestamp,
                "image_size": {
                    "width": self.resized_frame.shape[1],
                    "height": self.resized_frame.shape[0]
                },
                "annotations": self.canvas.metadata
            }
            
            json_path = export_dir / f"{scene_id}.json"
            with open(json_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.has_unsaved_changes = False

    def closeEvent(self, event):
        if self.has_unsaved_changes and len(self.canvas.metadata) > 0:
            reply = QMessageBox.question(
                self,
                'Save Changes',
                'You have unsaved annotations. Would you like to save them before closing?',
                QMessageBox.StandardButton.Save | QMessageBox.StandardButton.Discard | QMessageBox.StandardButton.Cancel,
                QMessageBox.StandardButton.Save
            )

            if reply == QMessageBox.StandardButton.Save:
                self.export_annotations()
                event.accept()
            elif reply == QMessageBox.StandardButton.Discard:
                event.accept()
            else:
                event.ignore()
        else:
            event.accept()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec()) 