import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { STLLoader } from 'three-stdlib';
import { OBJLoader } from 'three-stdlib';
import { Loader2 } from 'lucide-react';

// Model cache to improve loading times
const modelCache = new Map();

export default function Model3DViewer({ fileUrl, selectedColor = "black", className = "" }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sceneRef = useRef(null);
  const modelRef = useRef(null);

  // Color mapping
  const colorToHex = (colorName) => {
    const colorMap = {
      'white': 0xffffff,
      'black': 0x000000,
      'gray': 0xa0a0a0,
      'silver': 0xe0e0e0,
      'gold': 0xffd700,
      'brown': 0xa0522d,
      'red': 0xff3333,
      'blue': 0x3366ff,
      'yellow': 0xffee33,
      'green': 0x33ff33,
      'orange': 0xff9933,
      'purple': 0x9933ff,
      'pink': 0xff99cc,
      'copper': 0xb87333,
      'bronze': 0xcd7f32,
      'teal': 0x14b8a6,
      'marble': 0xffffff,
      'silk rainbow': 0xff0000
    };
    return colorMap[colorName.toLowerCase()] || 0x14b8a6;
  };

  useEffect(() => {
    if (!fileUrl || !mountRef.current) return;

    let camera, renderer, controls;
    let animationId;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        sceneRef.current = scene;

        // Camera
        camera = new THREE.PerspectiveCamera(
          45,
          mountRef.current.clientWidth / mountRef.current.clientHeight,
          0.1,
          1000
        );
        camera.position.set(0, 0, 100);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(1, 1, 1);
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-1, -1, -1);
        scene.add(directionalLight2);

        // Controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 500;

        // Load model with caching
        const fileExtension = fileUrl.split('.').pop().toLowerCase();
        
        // Check cache first
        if (modelCache.has(fileUrl)) {
          const cachedGeometry = modelCache.get(fileUrl);
          processModel(cachedGeometry, fileExtension, scene);
        } else {
          let loader;

          if (fileExtension === 'stl') {
            loader = new STLLoader();
          } else if (fileExtension === 'obj') {
            loader = new OBJLoader();
          } else {
            throw new Error('Unsupported file format. Please use STL or OBJ.');
          }

          loader.load(
            fileUrl,
            (geometry) => {
              // Cache the loaded geometry
              modelCache.set(fileUrl, geometry);
              processModel(geometry, fileExtension, scene);
            },
            (progress) => {
              // Loading progress
            },
            (err) => {
              console.error('Error loading 3D model:', err);
              setError('Failed to load 3D model');
              setLoading(false);
            }
          );
        }

        function processModel(geometry, fileExtension, scene) {
            const modelColor = colorToHex(selectedColor);
            const isRainbow = selectedColor.toLowerCase() === 'silk rainbow';
            let model;
            
            if (fileExtension === 'stl') {
              const material = new THREE.MeshPhongMaterial({
                color: modelColor,
                specular: 0x111111,
                shininess: 200,
                vertexColors: isRainbow
              });
              
              // Add rainbow vertex colors
              if (isRainbow) {
                const colors = [];
                const color = new THREE.Color();
                const positionAttribute = geometry.attributes.position;
                
                for (let i = 0; i < positionAttribute.count; i++) {
                  const hue = (i / positionAttribute.count);
                  color.setHSL(hue, 1.0, 0.5);
                  colors.push(color.r, color.g, color.b);
                }
                
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
              }
              
              model = new THREE.Mesh(geometry, material);
            } else {
              model = geometry;
              let childIndex = 0;
              const totalChildren = [];
              model.traverse((child) => {
                if (child instanceof THREE.Mesh) totalChildren.push(child);
              });
              
              model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  const material = new THREE.MeshPhongMaterial({
                    color: modelColor,
                    specular: 0x111111,
                    shininess: 200,
                    vertexColors: isRainbow
                  });
                  
                  if (isRainbow && child.geometry) {
                    const colors = [];
                    const color = new THREE.Color();
                    const positionAttribute = child.geometry.attributes.position;
                    
                    if (positionAttribute) {
                      for (let i = 0; i < positionAttribute.count; i++) {
                        const hue = ((childIndex + i / positionAttribute.count) / totalChildren.length) % 1.0;
                        color.setHSL(hue, 1.0, 0.5);
                        colors.push(color.r, color.g, color.b);
                      }
                      child.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                    }
                  }
                  
                  child.material = material;
                  childIndex++;
                }
              });
            }

            modelRef.current = model;

            // Center and scale model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            model.position.sub(center);
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 50 / maxDim;
            model.scale.setScalar(scale);

            scene.add(model);
            setLoading(false);
        }

        // Animation loop
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
          if (!mountRef.current) return;
          camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (err) {
        console.error('3D viewer initialization error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    init();

    // Cleanup
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (renderer && mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      }
      if (controls) {
        controls.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [fileUrl]);

  // Update color when selectedColor changes
  useEffect(() => {
    if (!modelRef.current || !sceneRef.current) return;

    const modelColor = colorToHex(selectedColor);
    const isRainbow = selectedColor.toLowerCase() === 'silk rainbow';
    
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (isRainbow) {
          // Re-apply rainbow colors
          child.material.vertexColors = true;
          if (child.geometry && child.geometry.attributes.position) {
            const colors = [];
            const color = new THREE.Color();
            const positionAttribute = child.geometry.attributes.position;
            
            for (let i = 0; i < positionAttribute.count; i++) {
              const hue = (i / positionAttribute.count);
              color.setHSL(hue, 1.0, 0.5);
              colors.push(color.r, color.g, color.b);
            }
            
            child.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          }
          child.material.needsUpdate = true;
        } else {
          // Solid color
          child.material.vertexColors = false;
          child.material.color.setHex(modelColor);
          child.material.needsUpdate = true;
        }
      }
    });
  }, [selectedColor]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      )}
      <div ref={mountRef} className="w-full h-full rounded-lg" style={{ minHeight: '400px' }} />
      {!loading && !error && (
        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          Drag to rotate • Scroll to zoom
        </div>
      )}
    </div>
  );
}