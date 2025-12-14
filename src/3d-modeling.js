// 3D 모델링 페이지 스크립트
import { createMeshyTask, getMeshyTask } from './meshyService.js';

// 상태 관리
let status = 'idle'; // 'idle' | 'creating' | 'polling' | 'success' | 'failed'
let progress = 0;
let modelUrl = null;
let pollingTimer = null;
let enhancedSketch = null;
const MESHY_API_KEY_STORAGE_KEY = 'vention_meshy_api_key';
const MESHY_PASSWORD_STORAGE_KEY = 'vention_meshy_password_verified';
const CORRECT_PASSWORD = '4321';

// DOM 요소
const meshyApiKeyAuthBtn = document.getElementById('meshyApiKeyAuthBtn');
const meshyPasswordAuthBtn = document.getElementById('meshyPasswordAuthBtn');
const meshyApiKeyAuthPanel = document.getElementById('meshyApiKeyAuthPanel');
const meshyPasswordAuthPanel = document.getElementById('meshyPasswordAuthPanel');
const meshyApiKeyInput = document.getElementById('meshyApiKeyInput');
const meshyPasswordInput = document.getElementById('meshyPasswordInput');
const saveMeshyApiKeyBtn = document.getElementById('saveMeshyApiKeyBtn');
const saveMeshyPasswordBtn = document.getElementById('saveMeshyPasswordBtn');
const apiKeyMessage = document.getElementById('apiKeyMessage');
const sketchContainer = document.getElementById('sketchContainer');
const noSketchMessage = document.getElementById('noSketchMessage');
const generateBtn = document.getElementById('generateBtn');
const statusContainer = document.getElementById('statusContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const errorMessage = document.getElementById('errorMessage');
const successContainer = document.getElementById('successContainer');
const downloadBtn = document.getElementById('downloadBtn');
const openInViewerBtn = document.getElementById('openInViewerBtn');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('3D 모델링 페이지 초기화 완료');
  
  // 저장된 인증 정보 불러오기
  loadMeshyApiKey();
  loadMeshyPassword();
  
  // 인증 방법 토글 버튼 이벤트
  meshyApiKeyAuthBtn?.addEventListener('click', () => {
    switchMeshyAuthPanel('apiKey');
  });
  
  meshyPasswordAuthBtn?.addEventListener('click', () => {
    switchMeshyAuthPanel('password');
  });
  
  // 이벤트 리스너
  saveMeshyApiKeyBtn?.addEventListener('click', saveMeshyApiKey);
  meshyApiKeyInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveMeshyApiKey();
    }
  });
  
  saveMeshyPasswordBtn?.addEventListener('click', saveMeshyPassword);
  meshyPasswordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveMeshyPassword();
    }
  });
  
  // localStorage에서 생성된 스케치 가져오기
  enhancedSketch = localStorage.getItem('vention_enhanced_sketch');
  
  if (enhancedSketch) {
    // 스케치 이미지 표시
    if (sketchContainer) {
      sketchContainer.innerHTML = `<img src="${enhancedSketch}" alt="Enhanced Sketch" class="sketch-preview-image" />`;
    }
    if (noSketchMessage) {
      noSketchMessage.style.display = 'none';
    }
    updateGenerateButton();
  } else {
    // 스케치가 없는 경우
    if (sketchContainer) {
      sketchContainer.innerHTML = '';
    }
    if (noSketchMessage) {
      noSketchMessage.style.display = 'block';
    }
    if (generateBtn) {
      generateBtn.disabled = true;
    }
  }
  
  // 이벤트 리스너
  generateBtn?.addEventListener('click', handleGenerate);
  downloadBtn?.addEventListener('click', handleDownload);
  openInViewerBtn?.addEventListener('click', handleOpenInViewer);
  
  // 이미지 파일 선택 이벤트
  const imageFileInput = document.getElementById('imageFileInput');
  imageFileInput?.addEventListener('change', handleImageFileSelect);
  
  // 페이지 언로드 시 타이머 정리
  window.addEventListener('beforeunload', () => {
    if (pollingTimer) {
      clearTimeout(pollingTimer);
    }
  });
});

// Meshy 인증 패널 전환
function switchMeshyAuthPanel(type) {
  if (type === 'apiKey') {
    meshyApiKeyAuthBtn?.classList.add('active');
    meshyPasswordAuthBtn?.classList.remove('active');
    meshyApiKeyAuthPanel?.classList.add('active');
    if (meshyApiKeyAuthPanel) {
      meshyApiKeyAuthPanel.style.display = 'block';
    }
    meshyPasswordAuthPanel?.classList.remove('active');
    if (meshyPasswordAuthPanel) {
      meshyPasswordAuthPanel.style.display = 'none';
    }
  } else if (type === 'password') {
    meshyPasswordAuthBtn?.classList.add('active');
    meshyApiKeyAuthBtn?.classList.remove('active');
    meshyPasswordAuthPanel?.classList.add('active');
    if (meshyPasswordAuthPanel) {
      meshyPasswordAuthPanel.style.display = 'block';
    }
    meshyApiKeyAuthPanel?.classList.remove('active');
    if (meshyApiKeyAuthPanel) {
      meshyApiKeyAuthPanel.style.display = 'none';
    }
  }
}

// Meshy API 키 저장
function saveMeshyApiKey() {
  const apiKey = meshyApiKeyInput?.value.trim();
  if (!apiKey) {
    showApiKeyMessage('API 키를 입력해주세요.', 'error');
    return;
  }
  
  localStorage.setItem(MESHY_API_KEY_STORAGE_KEY, apiKey);
  showApiKeyMessage('✅ API 키가 저장되었습니다.', 'success');
  updateGenerateButton();
  
  // API 키 입력 필드 위로 스크롤
  const apiKeyCard = document.querySelector('.api-key-card');
  if (apiKeyCard) {
    apiKeyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 저장된 Meshy API 키 불러오기
function loadMeshyApiKey() {
  const savedApiKey = localStorage.getItem(MESHY_API_KEY_STORAGE_KEY);
  if (savedApiKey && meshyApiKeyInput) {
    meshyApiKeyInput.value = savedApiKey;
    showApiKeyMessage('✅ 저장된 API 키가 로드되었습니다.', 'success');
  }
  updateGenerateButton();
}

// 저장된 비밀번호 확인 상태 불러오기
function loadMeshyPassword() {
  const isPasswordVerified = localStorage.getItem(MESHY_PASSWORD_STORAGE_KEY) === 'true';
  if (isPasswordVerified) {
    showApiKeyMessage('✅ 비밀번호가 확인되었습니다. (내부 API 키 사용)', 'success');
  }
  updateGenerateButton();
}

// 비밀번호 확인
function saveMeshyPassword() {
  const password = meshyPasswordInput?.value.trim();
  if (!password) {
    showApiKeyMessage('비밀번호를 입력해주세요.', 'error');
    return;
  }
  
  if (password !== CORRECT_PASSWORD) {
    showApiKeyMessage('❌ 비밀번호가 올바르지 않습니다.', 'error');
    if (meshyPasswordInput) {
      meshyPasswordInput.value = '';
    }
    return;
  }
  
  localStorage.setItem(MESHY_PASSWORD_STORAGE_KEY, 'true');
  localStorage.removeItem(MESHY_API_KEY_STORAGE_KEY); // API 키 입력 필드 초기화
  if (meshyApiKeyInput) {
    meshyApiKeyInput.value = '';
  }
  showApiKeyMessage('✅ 비밀번호가 확인되었습니다. (내부 API 키 사용)', 'success');
  if (meshyPasswordInput) {
    meshyPasswordInput.value = '';
  }
  updateGenerateButton();
  
  // API 키 입력 필드 위로 스크롤
  const apiKeyCard = document.querySelector('.api-key-card');
  if (apiKeyCard) {
    apiKeyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 현재 사용 가능한 API 키 가져오기
function getMeshyApiKey() {
  // 비밀번호 확인 상태 확인
  const isPasswordVerified = localStorage.getItem(MESHY_PASSWORD_STORAGE_KEY) === 'true';
  if (isPasswordVerified) {
    // .env에 저장된 API 키 사용
    return import.meta.env.VITE_MESHY_API_KEY || '';
  }
  
  // 사용자가 입력한 API 키 우선 사용
  const inputKey = meshyApiKeyInput?.value.trim();
  if (inputKey) {
    return inputKey;
  }
  // localStorage에서 가져오기
  return localStorage.getItem(MESHY_API_KEY_STORAGE_KEY) || '';
}

// API 키 메시지 표시
function showApiKeyMessage(message, type) {
  if (!apiKeyMessage) return;
  
  apiKeyMessage.textContent = message;
  apiKeyMessage.className = `api-key-message ${type}`;
  apiKeyMessage.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      apiKeyMessage.style.display = 'none';
    }, 3000);
  }
}

// 생성 버튼 상태 업데이트
function updateGenerateButton() {
  if (!generateBtn) return;
  
  const apiKey = getMeshyApiKey();
  const hasApiKey = !!apiKey;
  const hasSketch = !!enhancedSketch;
  const isPasswordVerified = localStorage.getItem(MESHY_PASSWORD_STORAGE_KEY) === 'true';
  
  generateBtn.disabled = !hasApiKey || !hasSketch;
  
  if (!hasApiKey && !isPasswordVerified) {
    generateBtn.title = '먼저 Meshy API 키를 입력하거나 비밀번호를 확인해주세요.';
  } else if (!hasSketch) {
    generateBtn.title = '먼저 AI 스케치 정교화 페이지에서 이미지를 생성해주세요.';
  } else {
    generateBtn.title = '';
  }
}

// 작업 상태 폴링
async function pollTask(taskId, apiKey) {
  try {
    const taskStatus = await getMeshyTask(taskId, apiKey);
    
    progress = taskStatus.progress || 0;
    updateProgress();
    
    if (taskStatus.status === 'SUCCEEDED' && taskStatus.model_urls?.glb) {
      modelUrl = taskStatus.model_urls.glb;
      setStatus('success');
    } else if (taskStatus.status === 'FAILED' || taskStatus.status === 'EXPIRED') {
      setError(taskStatus.message || '3D 모델 생성에 실패했습니다.');
      setStatus('failed');
    } else {
      // 계속 폴링
      pollingTimer = setTimeout(() => pollTask(taskId, apiKey), 2000);
    }
  } catch (err) {
    console.error('상태 확인 오류:', err);
    setError('상태 확인 중 오류가 발생했습니다.');
    setStatus('failed');
  }
}

// 3D 모델 생성 시작
async function handleGenerate() {
  const apiKey = getMeshyApiKey();
  if (!apiKey) {
    setError('먼저 Meshy API 키를 입력해주세요.');
    return;
  }
  
  if (!enhancedSketch) {
    setError('먼저 AI 스케치 정교화 페이지에서 이미지를 생성해주세요.');
    return;
  }
  
  setStatus('creating');
  setError(null);
  progress = 0;
  modelUrl = null;
  updateProgress();
  
  try {
    // Meshy API 작업 생성 (API 키 전달)
    // 주의: Meshy API는 공개 URL을 선호하지만, Data URI도 시도해봅니다.
    const taskId = await createMeshyTask(enhancedSketch, apiKey);
    
    setStatus('polling');
    pollTask(taskId, apiKey);
  } catch (err) {
    console.error('작업 생성 오류:', err);
    setError(err instanceof Error ? err.message : '작업 생성에 실패했습니다.');
    setStatus('failed');
  }
}

// 상태 업데이트
function setStatus(newStatus) {
  status = newStatus;
  
  // 상태에 따른 UI 업데이트
  if (statusContainer) {
    statusContainer.style.display = (status === 'creating' || status === 'polling') ? 'block' : 'none';
  }
  if (successContainer) {
    successContainer.style.display = status === 'success' ? 'block' : 'none';
  }
  if (generateBtn) {
    generateBtn.style.display = (status === 'idle' || status === 'failed') ? 'block' : 'none';
    
    if (status === 'idle' || status === 'failed') {
      generateBtn.disabled = false;
      generateBtn.textContent = status === 'failed' ? '다시 시도하기' : '3D 모델 생성하기';
    } else {
      generateBtn.disabled = true;
    }
  }
  
  // 상태 제목 업데이트
  const statusTitle = document.getElementById('statusTitle');
  if (statusTitle) {
    statusTitle.textContent = status === 'creating' ? '작업 요청 중...' : '3D 모델 생성 중...';
  }
  
  // 성공 상태일 때는 에러 메시지 숨기기
  if (status === 'success' || status === 'creating' || status === 'polling') {
    setError(null);
  }
  
  // model-viewer는 삭제되었으므로 관련 코드 제거
}

// 진행률 업데이트
function updateProgress() {
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  if (progressText) {
    progressText.textContent = `${progress}% 완료`;
  }
}

// 에러 메시지 표시
function setError(message) {
  if (errorMessage) {
    if (message) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
    } else {
      errorMessage.style.display = 'none';
      errorMessage.textContent = '';
    }
  }
}

// 다운로드
function handleDownload() {
  if (modelUrl) {
    const link = document.createElement('a');
    link.href = modelUrl;
    link.download = 'model.glb';
    link.click();
  }
}

// 3D 뷰어에서 열기
function handleOpenInViewer() {
  if (modelUrl) {
    // localStorage에 모델 URL 저장
    localStorage.setItem('vention_model_url', modelUrl);
    // 3D 뷰 페이지로 이동
    window.location.href = '3d-view.html';
  }
}

// 이미지 파일 선택 처리
function handleImageFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    setError('이미지 파일만 업로드 가능합니다.');
    return;
  }
  
  const reader = new FileReader();
  reader.onloadend = () => {
    const imageUrl = reader.result;
    enhancedSketch = imageUrl;
    
    // localStorage에 저장
    localStorage.setItem('vention_enhanced_sketch', imageUrl);
    
    // 스케치 이미지 표시
    if (sketchContainer) {
      sketchContainer.innerHTML = `<img src="${imageUrl}" alt="Selected Image" class="sketch-preview-image" />`;
    }
    if (noSketchMessage) {
      noSketchMessage.style.display = 'none';
    }
    updateGenerateButton();
    setError(null);
  };
  
  reader.readAsDataURL(file);
}

