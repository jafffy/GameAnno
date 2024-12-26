import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Image } from 'react-konva';
import useImage from 'use-image';

const AnnotationCanvas = ({ image, annotations, onAnnotationComplete }) => {
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState(null);
  const [imageObj] = useImage(image?.url);

  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('canvas-container');
      if (container && imageObj) {
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        const scaleX = containerWidth / imageObj.width;
        const scaleY = containerHeight / imageObj.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        
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
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
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
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

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
    if (!isDrawing) return;

    setIsDrawing(false);
    if (currentBox && currentBox.width > 5 && currentBox.height > 5) {
      // Convert coordinates back to original image scale
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
          
          {annotations.map((anno) => (
            <Rect
              key={anno.bounding_box_id}
              x={anno.coordinates[0] * scale}
              y={anno.coordinates[1] * scale}
              width={(anno.coordinates[2] - anno.coordinates[0]) * scale}
              height={(anno.coordinates[3] - anno.coordinates[1]) * scale}
              stroke="red"
              strokeWidth={2}
              fill="transparent"
            />
          ))}
          
          {currentBox && (
            <Rect
              x={currentBox.x * scale}
              y={currentBox.y * scale}
              width={currentBox.width * scale}
              height={currentBox.height * scale}
              stroke="red"
              strokeWidth={2}
              fill="transparent"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default AnnotationCanvas; 