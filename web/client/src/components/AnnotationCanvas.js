import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Image, Transformer } from 'react-konva';
import useImage from 'use-image';

const AnnotationCanvas = ({ 
  image, 
  annotations, 
  onAnnotationComplete, 
  onAnnotationSelect,
  selectedAnnotation,
  onAnnotationUpdate 
}) => {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState(null);
  const [imageObj, imageStatus] = useImage(image?.url, 'anonymous');
  const [isResizing, setIsResizing] = useState(false);
  const transformerRef = useRef();
  const selectedRectRef = useRef();

  // Effect to attach transformer to selected rect
  useEffect(() => {
    if (selectedAnnotation && transformerRef.current && selectedRectRef.current) {
      transformerRef.current.nodes([selectedRectRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedAnnotation]);

  // Debug log for image loading
  useEffect(() => {
    console.log('Image loading status:', { url: image?.url, status: imageStatus, imageObj });
    if (imageStatus === 'failed') {
      console.error('Failed to load image:', image?.url);
    }
  }, [image?.url, imageStatus, imageObj]);

  // Debug log for annotations prop changes
  useEffect(() => {
    console.log('AnnotationCanvas received annotations:', annotations);
  }, [annotations]);

  // Debug log for scale changes
  useEffect(() => {
    console.log('Scale updated:', scale);
  }, [scale]);

  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('canvas-container');
      if (container && imageObj) {
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        const scaleX = containerWidth / imageObj.width;
        const scaleY = containerHeight / imageObj.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        
        console.log('Updating canvas size:', { containerWidth, containerHeight, imageWidth: imageObj.width, imageHeight: imageObj.height, newScale });
        
        setScale(newScale);
        setStageSize({
          width: imageObj.width * newScale,
          height: imageObj.height * newScale
        });
      }
    };

    window.addEventListener('resize', updateSize);
    if (imageObj) {
      updateSize();
    }

    return () => window.removeEventListener('resize', updateSize);
  }, [imageObj]);

  const handleMouseDown = (e) => {
    if (isResizing) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const shape = e.target;

    // If clicking on a rectangle (existing annotation)
    if (shape && shape.getClassName() === 'Rect' && shape.attrs.id) {
      const annotation = annotations.find(a => a.bounding_box_id === shape.attrs.id);
      if (annotation) {
        onAnnotationSelect(annotation);
        return;
      }
    }
    
    // If clicking on the background or image, deselect current annotation
    if (shape === stage || shape.getClassName() === 'Image') {
      onAnnotationSelect(null);
    }
    
    // Only start drawing if we're clicking on the stage or image
    if (shape === stage || shape.getClassName() === 'Image') {
      // Convert position to unscaled coordinates
      const x = pos.x / scale;
      const y = pos.y / scale;
      
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentBox({
        x,
        y,
        width: 0,
        height: 0
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || isResizing) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    // Convert position to unscaled coordinates
    const x = pos.x / scale;
    const y = pos.y / scale;

    setCurrentBox({
      x: Math.min(x, startPoint.x),
      y: Math.min(y, startPoint.y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || isResizing) return;

    setIsDrawing(false);
    if (currentBox && currentBox.width > 5 && currentBox.height > 5) {
      const box = {
        x: currentBox.x,
        y: currentBox.y,
        width: currentBox.width,
        height: currentBox.height
      };
      onAnnotationComplete(box);
    }
    setCurrentBox(null);
  };

  const handleTransformEnd = (e) => {
    setIsResizing(false);
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and adjust width/height instead
    node.scaleX(1);
    node.scaleY(1);

    const annotation = annotations.find(a => a.bounding_box_id === node.id());
    if (annotation) {
      const newX = node.x() / scale;
      const newY = node.y() / scale;
      const newWidth = Math.abs(node.width() * scaleX) / scale;
      const newHeight = Math.abs(node.height() * scaleY) / scale;

      const updatedAnnotation = {
        ...annotation,
        coordinates: [
          newX,
          newY,
          newX + newWidth,
          newY + newHeight
        ]
      };
      onAnnotationUpdate(updatedAnnotation);
    }
  };

  const handleTransformStart = () => {
    setIsResizing(true);
  };

  const handleDragEnd = (e) => {
    const node = e.target;
    const annotation = annotations.find(a => a.bounding_box_id === node.id());
    if (annotation) {
      const newX = node.x() / scale;
      const newY = node.y() / scale;
      const width = (annotation.coordinates[2] - annotation.coordinates[0]);
      const height = (annotation.coordinates[3] - annotation.coordinates[1]);

      const updatedAnnotation = {
        ...annotation,
        coordinates: [
          newX,
          newY,
          newX + width,
          newY + height
        ]
      };
      onAnnotationUpdate(updatedAnnotation);
    }
  };

  if (!imageObj || !stageSize.width || !stageSize.height) {
    return <div id="canvas-container" style={{ flex: 1 }} />;
  }

  return (
    <div id="canvas-container" style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          <Image
            image={imageObj}
            width={imageObj.width}
            height={imageObj.height}
            scaleX={scale}
            scaleY={scale}
          />
          
          {annotations && annotations.map((anno) => {
            const x = anno.coordinates[0];
            const y = anno.coordinates[1];
            const width = anno.coordinates[2] - anno.coordinates[0];
            const height = anno.coordinates[3] - anno.coordinates[1];
            const isSelected = selectedAnnotation?.bounding_box_id === anno.bounding_box_id;
            
            return (
              <React.Fragment key={anno.bounding_box_id}>
                <Rect
                  id={anno.bounding_box_id}
                  x={x * scale}
                  y={y * scale}
                  width={width * scale}
                  height={height * scale}
                  stroke={isSelected ? "#00ff00" : "red"}
                  strokeWidth={isSelected ? 3 : 2}
                  fill={isSelected ? "rgba(0, 255, 0, 0.1)" : "transparent"}
                  draggable={isSelected}
                  onTransformStart={handleTransformStart}
                  onTransformEnd={handleTransformEnd}
                  onDragEnd={handleDragEnd}
                  ref={isSelected ? selectedRectRef : null}
                />
              </React.Fragment>
            );
          })}
          
          {selectedAnnotation && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Minimum size of 5x5 pixels
                const minSize = 5;
                if (newBox.width < minSize || newBox.height < minSize) {
                  return oldBox;
                }
                return newBox;
              }}
              enabledAnchors={[
                'top-left', 'top-center', 'top-right',
                'middle-left', 'middle-right',
                'bottom-left', 'bottom-center', 'bottom-right'
              ]}
              rotateEnabled={false}
              keepRatio={false}
              padding={5}
              anchorSize={8}
              anchorCornerRadius={2}
            />
          )}
          
          {currentBox && (
            <Rect
              x={currentBox.x * scale}
              y={currentBox.y * scale}
              width={currentBox.width * scale}
              height={currentBox.height * scale}
              stroke="red"
              strokeWidth={2}
              dash={[5, 5]}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default AnnotationCanvas; 