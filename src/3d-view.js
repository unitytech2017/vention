// 3D 뷰어 페이지 스크립트
let scene, camera, renderer, controls;
let models = []; // 배열로 변경
let selectedModel = null; // 선택된 모델
let animationMixer = null;
let lights = {};
const clock = new THREE.Clock();

// 모델 클릭 선택을 위한 변수
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function init() {
    const container = document.getElementById('canvas-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // 흰색 배경

    // Camera
    camera = new THREE.PerspectiveCamera(
        50,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 3, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 100;

    // Lights
    lights.ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(lights.ambient);

    lights.directional1 = new THREE.DirectionalLight(0xffffff, 1.2);
    lights.directional1.position.set(5, 5, 5);
    lights.directional1.castShadow = true;
    scene.add(lights.directional1);

    lights.directional2 = new THREE.DirectionalLight(0xffffff, 0.9);
    lights.directional2.position.set(-5, 3, -5);
    scene.add(lights.directional2);

    lights.directional3 = new THREE.DirectionalLight(0xffffff, 0.6);
    lights.directional3.position.set(0, -5, 0);
    scene.add(lights.directional3);

    lights.directional4 = new THREE.DirectionalLight(0xffffff, 1.05);
    lights.directional4.position.set(0, 5, 0);
    scene.add(lights.directional4);

    lights.hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    lights.hemisphere.position.set(0, 20, 0);
    scene.add(lights.hemisphere);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // 3D 뷰에서 모델 클릭 선택
    renderer.domElement.addEventListener('click', (event) => {
        const container = document.getElementById('canvas-container');
        const rect = container.getBoundingClientRect();
        
        // 마우스 좌표를 정규화 (-1 ~ 1)
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycaster 업데이트
        raycaster.setFromCamera(mouse, camera);
        
        // 모든 모델 객체 수집
        const allObjects = [];
        models.forEach(model => {
            if (model.visible) {
                model.object.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        allObjects.push({mesh: child, model: model});
                    }
                });
            }
        });
        
        // 교차 체크
        const meshes = allObjects.map(obj => obj.mesh);
        const intersects = raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            // 클릭된 메쉬가 속한 모델 찾기
            const clickedMesh = intersects[0].object;
            const foundModel = allObjects.find(obj => obj.mesh === clickedMesh);
            
            if (foundModel) {
                const modelIndex = models.indexOf(foundModel.model);
                if (modelIndex !== -1) {
                    selectModel(modelIndex);
                }
            }
        } else {
            // 빈 공간 클릭 시 선택 해제
            deselectModel();
        }
    });

    // Animation loop
    animate();
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (animationMixer) {
        animationMixer.update(delta);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

function loadModel(file) {
    document.getElementById('loading').classList.add('active');

    const reader = new FileReader();
    const extension = file.name.split('.').pop().toLowerCase();
    const modelId = Date.now() + Math.random();

    reader.onload = function(e) {
        const contents = e.target.result;

        try {
            switch(extension) {
                case 'obj':
                    loadOBJ(contents, file, modelId);
                    break;
                case 'fbx':
                    loadFBX(contents, file, modelId);
                    break;
                case 'stl':
                    loadSTL(contents, file, modelId);
                    break;
                case 'gltf':
                case 'glb':
                    loadGLTF(contents, file, modelId);
                    break;
                case 'usdz':
                    loadUSDZ(contents, file, modelId);
                    break;
                case 'ply':
                    loadPLY(contents, file, modelId);
                    break;
                case '3ds':
                    load3DS(contents, file, modelId);
                    break;
                default:
                    alert('지원하지 않는 파일 형식입니다.');
                    document.getElementById('loading').classList.remove('active');
            }
        } catch (error) {
            console.error('파일 로딩 오류:', error);
            alert('파일을 불러오는 중 오류가 발생했습니다.');
            document.getElementById('loading').classList.remove('active');
        }
    };

    if (extension === 'gltf' || extension === 'glb' || extension === 'fbx' || 
        extension === 'usdz' || extension === 'ply' || extension === '3ds') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function loadOBJ(contents, file, modelId) {
    const loader = new THREE.OBJLoader();
    const object = loader.parse(contents);
    
    object.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.5,
                metalness: 0.3,
                side: THREE.DoubleSide
            });
        }
    });
    
    addModelToScene(object, file, modelId);
}

function loadFBX(contents, file, modelId) {
    const originalWarn = console.warn;
    console.warn = () => {};
    
    try {
        const loader = new THREE.FBXLoader();
        const object = loader.parse(contents);
        
        object.traverse(child => {
            if (child instanceof THREE.Mesh && child.material) {
                child.material.side = THREE.DoubleSide;
            }
        });
        
        if (object.animations && object.animations.length > 0) {
            animationMixer = new THREE.AnimationMixer(object);
            
            object.animations.forEach(clip => {
                const action = animationMixer.clipAction(clip);
                action.play();
            });
            
            document.getElementById('animationControls').style.display = 'block';
            updateAnimationInfo(object.animations);
        } else {
            document.getElementById('animationControls').style.display = 'none';
        }
        
        addModelToScene(object, file, modelId);
    } finally {
        console.warn = originalWarn;
    }
}

function loadSTL(contents, file, modelId) {
    const loader = new THREE.STLLoader();
    const geometry = loader.parse(contents);
    
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.6,
        flatShading: false,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    addModelToScene(mesh, file, modelId);
}

function loadGLTF(contents, file, modelId) {
    const loader = new THREE.GLTFLoader();
    const isGLB = file.name.toLowerCase().endsWith('.glb');
    
    loader.parse(contents, '', (gltf) => {
        gltf.scene.traverse(child => {
            if (child instanceof THREE.Mesh && child.material) {
                child.material.side = THREE.DoubleSide;
            }
        });
        
        if (gltf.animations && gltf.animations.length > 0) {
            animationMixer = new THREE.AnimationMixer(gltf.scene);
            
            gltf.animations.forEach(clip => {
                const action = animationMixer.clipAction(clip);
                action.play();
            });
            
            document.getElementById('animationControls').style.display = 'block';
            updateAnimationInfo(gltf.animations);
        } else {
            document.getElementById('animationControls').style.display = 'none';
        }
        
        addModelToScene(gltf.scene, file, modelId);
    }, (error) => {
        console.error('GLTF 로딩 오류:', error);
        alert('GLTF/GLB 파일을 불러오는 중 오류가 발생했습니다.');
        document.getElementById('loading').classList.remove('active');
    });
}

function loadUSDZ(contents, file, modelId) {
    const loader = new THREE.USDZLoader();
    const group = loader.parse(contents);
    
    group.traverse(child => {
        if (child instanceof THREE.Mesh && child.material) {
            child.material.side = THREE.DoubleSide;
        }
    });
    
    addModelToScene(group, file, modelId);
}

function loadPLY(contents, file, modelId) {
    const loader = new THREE.PLYLoader();
    const geometry = loader.parse(contents);
    
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x888888,
        roughness: 0.4,
        metalness: 0.6,
        flatShading: false,
        side: THREE.DoubleSide,
        vertexColors: geometry.attributes.color ? true : false
    });
    const mesh = new THREE.Mesh(geometry, material);
    addModelToScene(mesh, file, modelId);
}

function load3DS(contents, file, modelId) {
    const loader = new THREE.TDSLoader();
    const object = loader.parse(contents);
    
    object.traverse(child => {
        if (child instanceof THREE.Mesh && child.material) {
            child.material.side = THREE.DoubleSide;
        }
    });
    
    addModelToScene(object, file, modelId);
}

function addModelToScene(object, file, modelId) {
    scene.add(object);

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const targetSize = 4;
    const scale = targetSize / maxDim;
    object.scale.multiplyScalar(scale);
    
    box.setFromObject(object);
    const scaledCenter = box.getCenter(new THREE.Vector3());
    
    // 모델들을 약간씩 오프셋
    const offset = models.length * 2;
    object.position.x = offset - scaledCenter.x;
    object.position.y -= scaledCenter.y;
    object.position.z -= scaledCenter.z;

    // 모델 정보 저장
    models.push({
        id: modelId,
        object: object,
        name: file.name,
        size: file.size,
        visible: true,
        initialPosition: {x: object.position.x, y: object.position.y, z: object.position.z},
        initialRotation: {x: 0, y: 0, z: 0},
        initialScale: object.scale.x
    });

    // UI 업데이트
    updateModelList();
    
    // 첫 번째 모델이면 카메라 위치 조정
    if (models.length === 1) {
        const scaledSize = box.getSize(new THREE.Vector3());
        const maxScaledDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxScaledDim / Math.sin(fov / 2)) * 1.5;

        camera.position.set(
            cameraDistance * 0.7,
            cameraDistance * 0.5,
            cameraDistance * 0.7
        );
        
        controls.target.set(0, 0, 0);
        controls.update();
    }

    document.getElementById('loading').classList.remove('active');
    document.getElementById('resetBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;
}

function updateModelList() {
    const modelItems = document.getElementById('modelItems');
    const modelList = document.getElementById('modelList');
    
    if (models.length === 0) {
        modelList.classList.remove('active');
        return;
    }
    
    modelList.classList.add('active');
    modelItems.innerHTML = '';
    
    models.forEach((model, index) => {
        const item = document.createElement('div');
        item.className = 'model-item' + (selectedModel === model ? ' selected' : '');
        
        // 모델 정보 영역
        const modelInfo = document.createElement('div');
        modelInfo.className = 'model-item-info';
        
        const modelName = document.createElement('div');
        modelName.className = 'model-item-name';
        modelName.textContent = model.name;
        modelName.title = model.name;
        
        const modelSize = document.createElement('div');
        modelSize.className = 'model-item-size';
        modelSize.textContent = formatFileSize(model.size);
        
        modelInfo.appendChild(modelName);
        modelInfo.appendChild(modelSize);
        
        // 컨트롤 버튼 영역
        const controls = document.createElement('div');
        controls.className = 'model-item-controls';
        
        // 가리기/보이기 버튼
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'model-item-btn' + (model.visible ? '' : ' hidden');
        toggleBtn.textContent = model.visible ? '👁️' : '🚫';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleModel(index);
        });
        
        // 삭제 버튼
        const removeBtn = document.createElement('button');
        removeBtn.className = 'model-item-btn';
        removeBtn.textContent = '🗑️';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeModel(index);
        });
        
        controls.appendChild(toggleBtn);
        controls.appendChild(removeBtn);
        
        item.appendChild(modelInfo);
        item.appendChild(controls);
        
        // 클릭 이벤트 리스너 추가
        item.addEventListener('click', () => {
            selectModel(index);
        });
        
        modelItems.appendChild(item);
    });
}

function selectModel(index) {
    if (models[index]) {
        selectedModel = models[index];
        updateModelList();
        updateTransformControls();
        const transformEl = document.getElementById('transformControls');
        transformEl.classList.add('active');
    }
}

function deselectModel() {
    selectedModel = null;
    updateModelList();
    document.getElementById('transformControls').classList.remove('active');
}

function updateTransformControls() {
    if (!selectedModel) return;

    const obj = selectedModel.object;
    
    // 위치
    document.getElementById('posX').value = obj.position.x.toFixed(1);
    document.getElementById('posY').value = obj.position.y.toFixed(1);
    document.getElementById('posZ').value = obj.position.z.toFixed(1);
    document.getElementById('posXValue').textContent = obj.position.x.toFixed(1);
    document.getElementById('posYValue').textContent = obj.position.y.toFixed(1);
    document.getElementById('posZValue').textContent = obj.position.z.toFixed(1);
    
    // 회전 (라디안 -> 도)
    const rotX = (obj.rotation.x * 180 / Math.PI) % 360;
    const rotY = (obj.rotation.y * 180 / Math.PI) % 360;
    const rotZ = (obj.rotation.z * 180 / Math.PI) % 360;
    
    document.getElementById('rotX').value = rotX.toFixed(0);
    document.getElementById('rotY').value = rotY.toFixed(0);
    document.getElementById('rotZ').value = rotZ.toFixed(0);
    document.getElementById('rotXValue').textContent = rotX.toFixed(0) + '°';
    document.getElementById('rotYValue').textContent = rotY.toFixed(0) + '°';
    document.getElementById('rotZValue').textContent = rotZ.toFixed(0) + '°';
    
    // 크기
    const avgScale = (obj.scale.x + obj.scale.y + obj.scale.z) / 3;
    const relativeScale = avgScale / selectedModel.initialScale;
    document.getElementById('scale').value = relativeScale.toFixed(1);
    document.getElementById('scaleValue').textContent = relativeScale.toFixed(1) + 'x';
}

function toggleModel(index) {
    if (models[index]) {
        models[index].visible = !models[index].visible;
        models[index].object.visible = models[index].visible;
        updateModelList();
    }
}

function removeModel(index) {
    if (models[index]) {
        if (selectedModel === models[index]) {
            deselectModel();
        }
        scene.remove(models[index].object);
        models.splice(index, 1);
        updateModelList();
        
        if (models.length === 0) {
            document.getElementById('resetBtn').disabled = true;
            document.getElementById('downloadBtn').disabled = true;
        }
    }
}

function updateAnimationInfo(animations) {
    const animInfo = document.getElementById('animationInfo');
    if (animations.length > 0) {
        const names = animations.map(clip => clip.name).join(', ');
        animInfo.textContent = `애니메이션 ${animations.length}개: ${names}`;
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('3D 뷰어 페이지 초기화 완료');
    
    // localStorage에서 모델 URL 확인 (3D 모델링 페이지에서 전달된 경우)
    const modelUrl = localStorage.getItem('vention_model_url');
    if (modelUrl) {
        // URL에서 모델 다운로드 및 로드
        fetch(modelUrl)
            .then(response => response.blob())
            .then(blob => {
                const file = new File([blob], 'model.glb', { type: 'model/gltf-binary' });
                loadModel(file);
            })
            .catch(err => {
                console.error('모델 로드 오류:', err);
            })
            .finally(() => {
                // 사용 후 localStorage에서 제거
                localStorage.removeItem('vention_model_url');
            });
    }
    
    // Event listeners
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        for (let i = 0; i < files.length; i++) {
            loadModel(files[i]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        for (let i = 0; i < files.length; i++) {
            loadModel(files[i]);
        }
    });

    document.getElementById('bgColor').addEventListener('input', (e) => {
        scene.background = new THREE.Color(e.target.value);
    });

    document.getElementById('wireframe').addEventListener('change', (e) => {
        models.forEach(model => {
            model.object.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.wireframe = e.target.checked;
                }
            });
        });
    });

    document.getElementById('autoRotate').addEventListener('change', (e) => {
        controls.autoRotate = e.target.checked;
        controls.autoRotateSpeed = 2.0;
    });

    document.getElementById('lightIntensity').addEventListener('input', (e) => {
        const intensity = parseFloat(e.target.value);
        lights.ambient.intensity = intensity * 0.8;
        lights.directional1.intensity = intensity * 0.8;
        lights.directional2.intensity = intensity * 0.6;
        lights.directional3.intensity = intensity * 0.4;
        lights.directional4.intensity = intensity * 0.7;
        lights.hemisphere.intensity = intensity * 0.6;
        
        const valueDisplay = document.getElementById('lightIntensityValue');
        if (valueDisplay) {
            valueDisplay.textContent = intensity.toFixed(1);
        }
    });

    document.getElementById('playAnimation').addEventListener('change', (e) => {
        if (animationMixer) {
            if (e.target.checked) {
                animationMixer.timeScale = 1;
            } else {
                animationMixer.timeScale = 0;
            }
        }
    });

    // 변형 컨트롤 이벤트 리스너
    document.getElementById('posX').addEventListener('input', (e) => {
        if (selectedModel) {
            selectedModel.object.position.x = parseFloat(e.target.value);
            document.getElementById('posXValue').textContent = e.target.value;
        }
    });

    document.getElementById('posY').addEventListener('input', (e) => {
        if (selectedModel) {
            selectedModel.object.position.y = parseFloat(e.target.value);
            document.getElementById('posYValue').textContent = e.target.value;
        }
    });

    document.getElementById('posZ').addEventListener('input', (e) => {
        if (selectedModel) {
            selectedModel.object.position.z = parseFloat(e.target.value);
            document.getElementById('posZValue').textContent = e.target.value;
        }
    });

    document.getElementById('rotX').addEventListener('input', (e) => {
        if (selectedModel) {
            selectedModel.object.rotation.x = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotXValue').textContent = e.target.value + '°';
        }
    });

    document.getElementById('rotY').addEventListener('input', (e) => {
        if (selectedModel) {
            selectedModel.object.rotation.y = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotYValue').textContent = e.target.value + '°';
        }
    });

    document.getElementById('rotZ').addEventListener('input', (e) => {
        if (selectedModel) {
            selectedModel.object.rotation.z = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotZValue').textContent = e.target.value + '°';
        }
    });

    document.getElementById('scale').addEventListener('input', (e) => {
        if (selectedModel) {
            const newScale = parseFloat(e.target.value) * selectedModel.initialScale;
            selectedModel.object.scale.set(newScale, newScale, newScale);
            document.getElementById('scaleValue').textContent = e.target.value + 'x';
        }
    });

    document.getElementById('deselectBtn').addEventListener('click', deselectModel);

    document.getElementById('resetBtn').addEventListener('click', () => {
        if (models.length > 0) {
            // 모든 모델의 바운딩 박스 계산
            const box = new THREE.Box3();
            models.forEach(model => {
                const modelBox = new THREE.Box3().setFromObject(model.object);
                box.union(modelBox);
            });
            
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

            camera.position.set(
                cameraDistance * 0.7,
                cameraDistance * 0.5,
                cameraDistance * 0.7
            );
            controls.target.set(0, 0, 0);
            controls.update();
        }
    });

    document.getElementById('downloadBtn').addEventListener('click', () => {
        renderer.render(scene, camera);
        const link = document.createElement('a');
        link.download = 'screenshot.png';
        link.href = renderer.domElement.toDataURL();
        link.click();
    });

    // Initialize
    init();
});

