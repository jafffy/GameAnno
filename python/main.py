import sys
import cv2
import json
import os
from pathlib import Path
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                            QHBoxLayout, QPushButton, QLabel, QFileDialog, 
                            QSpinBox, QDialog, QComboBox, QCheckBox, QLineEdit,
                            QListWidget, QScrollArea, QMessageBox)
from PyQt6.QtCore import Qt, QRect, QPoint, QTimer
from PyQt6.QtGui import QImage, QPixmap, QPainter, QPen, QColor
import numpy as np
import datetime
import tempfile
import shutil
from config import INTERACTION_CATEGORIES, INTERACTION_TYPES

class DirectoryManager:
    def __init__(self):
        self.config_file = Path.home() / ".gameanno" / "directory_config.json"
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        self.load_config()

    def load_config(self):
        self.config = {
            "last_image_directory": str(Path.home()),
            "last_video_directory": str(Path.home())
        }
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    self.config.update(json.load(f))
            except Exception as e:
                print(f"Error loading directory config: {e}")

    def save_config(self):
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            print(f"Error saving directory config: {e}")

    def get_last_directory(self, file_type):
        """Get last directory for given file type ('image' or 'video')"""
        key = f"last_{file_type}_directory"
        return self.config.get(key, str(Path.home()))

    def update_last_directory(self, file_type, path):
        """Update last directory for given file type ('image' or 'video')"""
        key = f"last_{file_type}_directory"
        self.config[key] = str(Path(path).parent)
        self.save_config()

class AutoSave:
    def __init__(self, main_window):
        self.main_window = main_window
        self.autosave_dir = Path(tempfile.gettempdir()) / "gameanno_autosave"
        self.autosave_dir.mkdir(parents=True, exist_ok=True)
        self.timer = QTimer()
        self.timer.timeout.connect(self.perform_autosave)
        self.timer.start(60000)  # Autosave every 60 seconds

    def perform_autosave(self):
        if not self.main_window.has_unsaved_changes or not self.main_window.current_frame is not None:
            return

        # Create autosave data
        autosave_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "is_image": self.main_window.is_image,
            "frame_number": self.main_window.current_frame_number,
            "annotations": self.main_window.canvas.metadata
        }

        # Save current frame
        frame_path = self.autosave_dir / "autosave_frame.png"
        cv2.imwrite(str(frame_path), self.main_window.resized_frame)

        # Save metadata
        metadata_path = self.autosave_dir / "autosave_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(autosave_data, f, indent=2)

    def check_for_autosave(self):
        metadata_path = self.autosave_dir / "autosave_metadata.json"
        frame_path = self.autosave_dir / "autosave_frame.png"

        if metadata_path.exists() and frame_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    autosave_data = json.load(f)
                
                timestamp = datetime.datetime.fromisoformat(autosave_data["timestamp"])
                time_diff = datetime.datetime.now() - timestamp
                
                # Only recover autosaves less than 1 day old
                if time_diff.days < 1:
                    reply = QMessageBox.question(
                        self.main_window,
                        'Recover Autosave',
                        f'Found autosaved work from {timestamp.strftime("%Y-%m-%d %H:%M:%S")}. Would you like to recover it?',
                        QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                        QMessageBox.StandardButton.Yes
                    )

                    if reply == QMessageBox.StandardButton.Yes:
                        return autosave_data, frame_path
            except Exception as e:
                print(f"Error reading autosave: {e}")
        
        return None, None

    def clear_autosave(self):
        try:
            shutil.rmtree(self.autosave_dir)
            self.autosave_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"Error clearing autosave: {e}")

class AnnotationDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Annotation Details")
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout()

        # Category section
        layout.addWidget(QLabel("Category Search:"))
        self.category_search = QLineEdit()
        self.category_search.setPlaceholderText("Search categories...")
        self.category_search.textChanged.connect(self.filter_categories)
        layout.addWidget(self.category_search)

        self.category_list = QListWidget()
        self.category_list.addItems(INTERACTION_CATEGORIES)
        self.category_list.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
        layout.addWidget(self.category_list)

        # Interactive checkbox
        self.interactive_check = QCheckBox("Is Interactive?")
        layout.addWidget(self.interactive_check)

        # Interaction types section
        layout.addWidget(QLabel("Interaction Type Search:"))
        self.interaction_search = QLineEdit()
        self.interaction_search.setPlaceholderText("Search interaction types...")
        self.interaction_search.textChanged.connect(self.filter_interactions)
        layout.addWidget(self.interaction_search)

        self.interaction_list = QListWidget()
        self.interaction_list.addItems(INTERACTION_TYPES)
        self.interaction_list.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
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

    def filter_categories(self, text):
        for i in range(self.category_list.count()):
            item = self.category_list.item(i)
            item.setHidden(text.lower() not in item.text().lower())

    def filter_interactions(self, text):
        for i in range(self.interaction_list.count()):
            item = self.interaction_list.item(i)
            item.setHidden(text.lower() not in item.text().lower())

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
                        "categories": [item.text() for item in dialog.category_list.selectedItems()],
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
        self.directory_manager = DirectoryManager()
        self.setup_ui()
        self.current_frame = None
        self.cap = None
        self.frame_count = 0
        self.current_frame_number = 0
        self.is_image = False
        self.original_size = (0, 0)  # Track original image size
        
        # Initialize autosave
        self.autosave = AutoSave(self)
        self.check_for_previous_autosave()

    def check_for_previous_autosave(self):
        autosave_data, frame_path = self.autosave.check_for_autosave()
        if autosave_data:
            # Load the autosaved frame
            self.current_frame = cv2.imread(str(frame_path))
            self.is_image = autosave_data["is_image"]
            self.current_frame_number = autosave_data["frame_number"]
            
            # Display the frame
            self.show_frame()
            
            # Restore annotations
            self.canvas.metadata = autosave_data["annotations"]
            self.canvas.boxes = []
            
            # Recreate boxes from metadata
            for metadata in self.canvas.metadata:
                coords = metadata["coordinates"]
                box = QRect(
                    coords[0],
                    coords[1],
                    coords[2] - coords[0],
                    coords[3] - coords[1]
                )
                self.canvas.boxes.append(box)
            
            self.canvas.update()
            self.has_unsaved_changes = True

    def check_unsaved_changes(self):
        """Check if there are unsaved changes and ask user what to do"""
        if self.has_unsaved_changes and len(self.canvas.metadata) > 0:
            reply = QMessageBox.question(
                self,
                'Save Changes',
                'You have unsaved annotations. Would you like to save them before loading a new file?',
                QMessageBox.StandardButton.Save | QMessageBox.StandardButton.Discard | QMessageBox.StandardButton.Cancel,
                QMessageBox.StandardButton.Save
            )

            if reply == QMessageBox.StandardButton.Save:
                self.export_annotations()
                return True
            elif reply == QMessageBox.StandardButton.Discard:
                return True
            else:  # Cancel
                return False
        return True

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
        if not self.check_unsaved_changes():
            return

        last_dir = self.directory_manager.get_last_directory('video')
        file_name, _ = QFileDialog.getOpenFileName(
            self, "Open Video File", last_dir,
            "Video Files (*.mp4 *.avi *.mkv)"
        )
        if file_name:
            self.directory_manager.update_last_directory('video', file_name)
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
        if not self.check_unsaved_changes():
            return

        last_dir = self.directory_manager.get_last_directory('image')
        file_name, _ = QFileDialog.getOpenFileName(
            self, "Open Image File", last_dir,
            "Image Files (*.png *.jpg *.jpeg *.bmp)"
        )
        if file_name:
            self.directory_manager.update_last_directory('image', file_name)
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
            self.autosave.clear_autosave()  # Clear autosave after successful export

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
                self.autosave.clear_autosave()  # Clear autosave after successful save
                event.accept()
            elif reply == QMessageBox.StandardButton.Discard:
                self.autosave.clear_autosave()  # Clear autosave when explicitly discarding
                event.accept()
            else:
                event.ignore()
        else:
            self.autosave.clear_autosave()  # Clear autosave when closing with no changes
            event.accept()

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec()) 