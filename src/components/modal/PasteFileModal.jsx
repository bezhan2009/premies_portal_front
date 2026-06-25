import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Paintbrush, Undo } from 'lucide-react';
import useThemeStore from '../../store/useThemeStore';

const PasteFileModal = ({ isOpen, file, onClose, onSend }) => {
  const { theme } = useThemeStore();
  const [message, setMessage] = useState('');
  const [isImage, setIsImage] = useState(false);
  
  // Paint state
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#eb2525');
  const [lineWidth] = useState(4);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  useEffect(() => {
    if (isOpen && file) {
      const isImg = file.type.startsWith('image/');
      setIsImage(isImg);
      const url = URL.createObjectURL(file);
      setMessage('');
      setPaths([]);
      setCurrentPath(null);

      if (isImg) {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          imgRef.current = img;
          redrawCanvas();
        };
      }

      return () => URL.revokeObjectURL(url);
    }
  }, [isOpen, file]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions based on image and available space
    const maxWidth = window.innerWidth * 0.8;
    const maxHeight = window.innerHeight * 0.6;
    
    let width = imgRef.current.width;
    let height = imgRef.current.height;
    
    // Scale down if needed
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = width * ratio;
      height = height * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    
    // Draw all paths
    paths.forEach(p => drawPath(ctx, p));
    if (currentPath) drawPath(ctx, currentPath);
  };

  useEffect(() => {
    if (isImage && paths.length >= 0) {
      redrawCanvas();
    }
  }, [paths, currentPath]);

  const drawPath = (ctx, path) => {
    if (path.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!isImage) return;
    const pos = getMousePos(e);
    setIsDrawing(true);
    setCurrentPath({ color, width: lineWidth, points: [pos] });
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    if (!isDrawing || !currentPath) return;
    const pos = getMousePos(e);
    setCurrentPath(prev => ({
      ...prev,
      points: [...prev.points, pos]
    }));
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath && currentPath.points.length > 0) {
      setPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath(null);
  };

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (isImage && canvasRef.current && paths.length > 0) {
      // If image is painted, export canvas to blob
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const paintedFile = new File([blob], file.name || 'image.png', { type: file.type || 'image/png' });
          onSend(paintedFile, message);
        } else {
          onSend(file, message);
        }
      }, file.type || 'image/png');
    } else {
      // Send original file
      onSend(file, message);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 100000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(8px)'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{
          background: 'var(--bg-surface, #fff)',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-sidebar, #f8fafc)'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-color, #1e293b)' }}>
            Отправка файла
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {isImage ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div style={{ 
                position: 'relative', 
                borderRadius: '8px', 
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                background: '#e2e8f0'
              }}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  style={{ 
                    display: 'block', 
                    cursor: 'crosshair',
                    maxWidth: '100%',
                    touchAction: 'none'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', padding: '8px 16px', background: 'var(--bg-color, #f1f5f9)', borderRadius: '20px' }}>
                <Paintbrush size={16} color="var(--text-secondary)" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['#eb2525', '#3b82f6', '#10b981', '#f59e0b', '#000000', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: color === c ? '2px solid var(--text-color)' : '2px solid transparent',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                </div>
                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />
                <button
                  onClick={handleUndo}
                  disabled={paths.length === 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: paths.length === 0 ? 'default' : 'pointer',
                    color: paths.length === 0 ? '#cbd5e1' : 'var(--text-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Undo size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              padding: '40px 20px',
              background: 'var(--bg-color, #f1f5f9)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <img src="/src/assets/file.png" alt="file" style={{ width: '64px', height: '64px', opacity: 0.8 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-color)', wordBreak: 'break-all' }}>{file.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
          )}

          <div style={{ width: '100%', display: 'flex', gap: '10px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="Добавить подпись..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-color, #f8fafc)',
                color: 'var(--text-color)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSubmit}
              style={{
                background: '#eb2525',
                color: 'white',
                border: 'none',
                width: '46px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PasteFileModal;
