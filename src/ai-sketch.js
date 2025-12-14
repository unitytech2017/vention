// AI 스케치 정교화 페이지 스크립트
import './styles.css';

// 상태 관리
let originalImageFile = null;
let generatedImageUrl = null;
let generatedSketchUrl = null; // 스케치 이미지 URL 저장
const API_KEY_STORAGE_KEY = 'vention_gemini_api_key';
const PASSWORD_STORAGE_KEY = 'vention_sketch_password_verified';
const CORRECT_PASSWORD = '1234';

// DOM 요소
const apiKeyAuthBtn = document.getElementById('apiKeyAuthBtn');
const passwordAuthBtn = document.getElementById('passwordAuthBtn');
const apiKeyAuthPanel = document.getElementById('apiKeyAuthPanel');
const passwordAuthPanel = document.getElementById('passwordAuthPanel');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const passwordInput = document.getElementById('passwordInput');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const originalImage = document.getElementById('originalImage');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const promptInput = document.getElementById('promptInput');
const enhanceBtn = document.getElementById('enhanceBtn');
const resultContainer = document.getElementById('resultContainer');
const errorMessage = document.getElementById('errorMessage');
const apiKeyMessage = document.getElementById('apiKeyMessage');
const goToModelingBtn = document.getElementById('goToModelingBtn');
const downloadBtn = document.getElementById('downloadBtn');
const renderBtn = document.getElementById('renderBtn');
const resultActions = document.getElementById('resultActions');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI 스케치 페이지 초기화 완료');
  
  // 저장된 인증 정보 불러오기
  loadApiKey();
  loadPassword();
  
  // 인증 방법 토글 버튼 이벤트
  apiKeyAuthBtn?.addEventListener('click', () => {
    switchAuthPanel('apiKey');
  });
  
  passwordAuthBtn?.addEventListener('click', () => {
    switchAuthPanel('password');
  });
  
  // 이벤트 리스너 설정
  saveApiKeyBtn?.addEventListener('click', saveApiKey);
  apiKeyInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
    }
  });
  
  savePasswordBtn?.addEventListener('click', savePassword);
  passwordInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      savePassword();
    }
  });
  
  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);
  
  // 드래그 앤 드롭
  uploadZone.addEventListener('dragover', handleDragOver);
  uploadZone.addEventListener('dragleave', handleDragLeave);
  uploadZone.addEventListener('drop', handleDrop);
  
  enhanceBtn.addEventListener('click', handleEnhance);
  goToModelingBtn.addEventListener('click', () => {
    window.location.href = '3d-modeling.html';
  });
  downloadBtn?.addEventListener('click', handleDownload);
  renderBtn?.addEventListener('click', handleRender);
});

// 인증 패널 전환
function switchAuthPanel(type) {
  if (type === 'apiKey') {
    apiKeyAuthBtn?.classList.add('active');
    passwordAuthBtn?.classList.remove('active');
    apiKeyAuthPanel?.classList.add('active');
    apiKeyAuthPanel.style.display = 'block';
    passwordAuthPanel?.classList.remove('active');
    passwordAuthPanel.style.display = 'none';
  } else if (type === 'password') {
    passwordAuthBtn?.classList.add('active');
    apiKeyAuthBtn?.classList.remove('active');
    passwordAuthPanel?.classList.add('active');
    passwordAuthPanel.style.display = 'block';
    apiKeyAuthPanel?.classList.remove('active');
    apiKeyAuthPanel.style.display = 'none';
  }
}

// API 키 저장
function saveApiKey() {
  const apiKey = apiKeyInput?.value.trim();
  if (!apiKey) {
    showApiKeyMessage('API 키를 입력해주세요.', 'error');
    return;
  }
  
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  showApiKeyMessage('✅ API 키가 저장되었습니다.', 'success');
  updateEnhanceButton();
  
  // API 키 입력 필드 위로 스크롤
  const apiKeyCard = document.querySelector('.api-key-card');
  if (apiKeyCard) {
    apiKeyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 비밀번호 확인
function savePassword() {
  const password = passwordInput.value.trim();
  if (!password) {
    showApiKeyMessage('비밀번호를 입력해주세요.', 'error');
    return;
  }
  
  if (password !== CORRECT_PASSWORD) {
    showApiKeyMessage('❌ 비밀번호가 올바르지 않습니다.', 'error');
    passwordInput.value = '';
    return;
  }
  
  localStorage.setItem(PASSWORD_STORAGE_KEY, 'verified');
  showApiKeyMessage('✅ 비밀번호가 확인되었습니다.', 'success');
  passwordInput.value = '';
  updateEnhanceButton();
  
  // 비밀번호 입력 필드 위로 스크롤
  const apiKeyCard = document.querySelector('.api-key-card');
  if (apiKeyCard) {
    apiKeyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// API 키 불러오기
function loadApiKey() {
  const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (savedKey) {
    apiKeyInput.value = savedKey;
    updateEnhanceButton();
  }
}

// 비밀번호 확인 상태 불러오기
function loadPassword() {
  const isVerified = localStorage.getItem(PASSWORD_STORAGE_KEY) === 'verified';
  if (isVerified) {
    updateEnhanceButton();
  }
}

// 사용할 API 키 가져오기 (사용자 API 키 우선, 없으면 환경변수)
function getApiKey() {
  // 1. 사용자가 입력한 API 키가 있으면 그것 사용
  const userApiKey = apiKeyInput.value.trim() || localStorage.getItem(API_KEY_STORAGE_KEY);
  if (userApiKey) {
    return userApiKey;
  }
  
  // 2. 비밀번호가 확인되었으면 환경변수 API 키 사용
  const isPasswordVerified = localStorage.getItem(PASSWORD_STORAGE_KEY) === 'verified';
  if (isPasswordVerified) {
    const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envApiKey) {
      return envApiKey;
    }
  }
  
  return '';
}

// 인증 상태 확인 (API 키 또는 비밀번호 중 하나라도 있으면 true)
function isAuthenticated() {
  const userApiKey = apiKeyInput.value.trim() || localStorage.getItem(API_KEY_STORAGE_KEY);
  const isPasswordVerified = localStorage.getItem(PASSWORD_STORAGE_KEY) === 'verified';
  const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  return !!(userApiKey || (isPasswordVerified && envApiKey));
}

// 향상 버튼 상태 업데이트
function updateEnhanceButton() {
  const authenticated = isAuthenticated();
  const hasImage = !!originalImageFile;
  enhanceBtn.disabled = !authenticated || !hasImage;
  
  if (!authenticated) {
    enhanceBtn.title = '먼저 API 키 또는 비밀번호를 입력해주세요.';
  } else if (!hasImage) {
    enhanceBtn.title = '먼저 이미지를 업로드해주세요.';
  } else {
    enhanceBtn.title = '';
  }
}

// 파일 선택 처리
function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (file) {
    handleFile(file);
  }
}

// 파일 처리
function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('이미지 파일만 업로드 가능합니다.');
    return;
  }
  
  originalImageFile = file;
  const reader = new FileReader();
  
  reader.onloadend = () => {
    originalImage.src = reader.result;
    originalImage.style.display = 'block';
    uploadPlaceholder.style.display = 'none';
    updateEnhanceButton();
    generatedImageUrl = null;
    generatedSketchUrl = null;
    resultContainer.innerHTML = '<p>AI가 다듬은 깔끔한 디자인이 여기에 표시됩니다.</p>';
    goToModelingBtn.style.display = 'none';
    resultActions.style.display = 'none';
    hideError();
  };
  
  reader.readAsDataURL(file);
}

// 드래그 오버
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadZone.classList.add('dragover');
}

// 드래그 리브
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadZone.classList.remove('dragover');
}

// 드롭
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  uploadZone.classList.remove('dragover');
  
  const file = e.dataTransfer.files?.[0];
  if (file) {
    handleFile(file);
  }
}

// 파일을 Base64로 변환
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      // data:image/png;base64, 부분 제거
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// 스케치 정교화
async function handleEnhance() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showError('먼저 API 키 또는 비밀번호를 입력해주세요.');
    if (!apiKeyInput.value.trim() && !localStorage.getItem(API_KEY_STORAGE_KEY)) {
      apiKeyInput.focus();
    } else {
      passwordInput.focus();
    }
    return;
  }
  
  if (!originalImageFile) {
    showError('먼저 스케치 이미지를 업로드해주세요.');
    return;
  }
  
  enhanceBtn.disabled = true;
  enhanceBtn.innerHTML = '<span class="loading"></span> 처리 중...';
  hideError();
  resultContainer.innerHTML = '<div class="loading-spinner"><span class="loading"></span> AI가 스케치를 정교화하고 있습니다...</div>';
  
  try {
    const base64Image = await fileToBase64(originalImageFile);
    const mimeType = originalImageFile.type;
    const prompt = promptInput.value.trim();
    
    // 선택된 모드 가져오기
    const modeRadios = document.querySelectorAll('input[name="generationMode"]');
    const selectedMode = Array.from(modeRadios).find(radio => radio.checked)?.value || 'sketch';
    
    const result = await enhanceSketch(apiKey, base64Image, mimeType, prompt, selectedMode);
    const imageUrl = `data:image/png;base64,${result}`;
    
    generatedImageUrl = imageUrl;
    
    // 스케치 모드일 경우 스케치 이미지로 저장
    if (selectedMode === 'sketch') {
      generatedSketchUrl = imageUrl;
    }
    
    // 렌더링 모드일 경우 렌더링 이미지로 저장
    if (selectedMode === 'rendering') {
      // localStorage에 저장하여 3D 모델링 페이지에서 사용
      localStorage.setItem('vention_enhanced_sketch', imageUrl);
    }
    
    resultContainer.innerHTML = `<img src="${imageUrl}" alt="Enhanced Design" class="result-image enhanced-image" />`;
    
    // 결과 액션 버튼 표시
    resultActions.style.display = 'flex';
    
    // 스케치 모드일 경우 렌더링 버튼 표시, 렌더링 모드일 경우 3D 모델링 버튼 표시
    if (selectedMode === 'sketch') {
      generatedSketchUrl = imageUrl;
      renderBtn.style.display = 'block';
      goToModelingBtn.style.display = 'none';
      // 스케치 이미지도 localStorage에 저장 (렌더링 전에 사용할 수 있도록)
      localStorage.setItem('vention_enhanced_sketch', imageUrl);
    } else {
      renderBtn.style.display = 'none';
      goToModelingBtn.style.display = 'block';
    }
    
  } catch (err) {
    console.error('스케치 정교화 오류:', err);
    showError(err instanceof Error ? err.message : '이미지 생성 중 알 수 없는 오류가 발생했습니다.');
    resultContainer.innerHTML = '<p>AI가 다듬은 깔끔한 디자인이 여기에 표시됩니다.</p>';
    resultActions.style.display = 'none';
  } finally {
    updateEnhanceButton();
    enhanceBtn.innerHTML = '스케치 정교화하기';
  }
}

// Gemini 2.5 Flash Image (Nano Banana)를 사용한 스케치 정교화
// 입력: 스케치 이미지 + 프롬프트 -> 출력: 정교화된 이미지
async function enhanceSketch(apiKey, base64Image, mimeType, prompt, mode = 'sketch') {
  
  // 1. 모델 선택 (문서에 나온 모델명)
  // - gemini-2.5-flash-image (빠름, Nano Banana)
  // - gemini-3-pro-image-preview (더 고퀄리티, Nano Banana Pro)
  const modelName = 'gemini-2.5-flash-image'; 

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  // 2. 프롬프트 구성 (모드에 따라 다른 프롬프트 사용)
  let textPrompt;
  
  if (mode === 'rendering') {
    // 렌더링 모드: 사실적인 제품 렌더링
    textPrompt = prompt 
      ? `Transform this sketch into a photorealistic, high-quality product design. Style: ${prompt}. Keep the original composition.`
      : "Turn this rough sketch into a high-quality, photorealistic product render. White background, studio lighting.";
  } else {
    // 스케치 모드: 정교한 스케치
    textPrompt = prompt 
      ? `Enhance this rough sketch into a refined, detailed technical sketch. Style: ${prompt}. Maintain sketch-like quality with clean lines, proper proportions, and added details. Keep it as a black and white line drawing.`
      : "Refine this rough sketch into a clean, detailed technical drawing. Improve line quality, add missing details, correct proportions, and enhance clarity while keeping the sketch aesthetic. Black and white line art style.";
  }

  console.log(`Gemini(${modelName})에게 스케치 정교화 요청 중...`);

  // 3. API 호출
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: textPrompt },
          // 여기에 스케치 이미지를 인라인 데이터로 넣습니다.
          { 
            inline_data: { 
              mime_type: mimeType, 
              data: base64Image 
            } 
          }
        ]
      }],
      // 문서에 나온대로 설정: 이미지만 받겠다고 명시
      generationConfig: {
        responseModalities: ["IMAGE"], 
        imageConfig: {
            aspectRatio: "1:1" // 필요에 따라 "16:9", "4:3" 등으로 변경 가능
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Error:', errorText);
    
    // 404가 뜨면 아직 해당 계정에 이 모델이 안 열린 것일 수 있습니다.
    if (response.status === 404) {
      throw new Error(`모델(${modelName})을 찾을 수 없습니다. API 키 권한을 확인해주세요.`);
    }
    throw new Error(`이미지 생성 실패 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('Gemini 응답 수신 완료');

  // 4. 응답 파싱 (문서의 REST 예제 참고)
  // 응답 구조: candidates[0].content.parts[].inlineData.data (Base64)
  
  // 이미지 데이터 찾기
  let generatedBase64 = null;
  const parts = data.candidates?.[0]?.content?.parts;
  
  if (parts) {
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        generatedBase64 = part.inlineData.data;
        break;
      }
    }
  }

  if (!generatedBase64) {
    throw new Error('생성된 이미지 데이터를 찾을 수 없습니다.');
  }

  return generatedBase64;
}

// API 키 메시지 표시
function showApiKeyMessage(message, type = 'success') {
  apiKeyMessage.textContent = message;
  apiKeyMessage.style.display = 'block';
  apiKeyMessage.className = `api-key-message ${type === 'success' ? 'success' : 'error'}`;
  
  if (type === 'success') {
    setTimeout(() => {
      hideApiKeyMessage();
    }, 3000);
  }
}

// API 키 메시지 숨김
function hideApiKeyMessage() {
  apiKeyMessage.style.display = 'none';
}

// 에러 표시
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  errorMessage.className = 'error-message';
}

// 성공 메시지 표시
function showSuccess(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  errorMessage.className = 'success-message';
  setTimeout(() => {
    hideError();
  }, 3000);
}

// 에러 숨김
function hideError() {
  errorMessage.style.display = 'none';
}

// 렌더링 처리
async function handleRender() {
  if (!generatedSketchUrl) {
    showError('먼저 스케치 이미지를 생성해주세요.');
    return;
  }
  
  const apiKey = getApiKey();
  if (!apiKey) {
    showError('먼저 API 키 또는 비밀번호를 입력해주세요.');
    return;
  }
  
  renderBtn.disabled = true;
  renderBtn.innerHTML = '<span class="loading"></span> 렌더링 중...';
  hideError();
  resultContainer.innerHTML = '<div class="loading-spinner"><span class="loading"></span> AI가 스케치를 렌더링하고 있습니다...</div>';
  
  try {
    // Base64 이미지를 Blob으로 변환
    const response = await fetch(generatedSketchUrl);
    const blob = await response.blob();
    const file = new File([blob], 'sketch.png', { type: 'image/png' });
    
    const base64Image = await fileToBase64(file);
    const mimeType = file.type;
    const prompt = promptInput.value.trim();
    
    // 렌더링 모드로 이미지 생성
    const result = await enhanceSketch(apiKey, base64Image, mimeType, prompt, 'rendering');
    const imageUrl = `data:image/png;base64,${result}`;
    
    generatedImageUrl = imageUrl;
    
    // 렌더링 이미지를 localStorage에 저장하여 3D 모델링 페이지에서 사용
    localStorage.setItem('vention_enhanced_sketch', imageUrl);
    
    resultContainer.innerHTML = `<img src="${imageUrl}" alt="Rendered Design" class="result-image enhanced-image" />`;
    
    // 렌더링 버튼 숨기고 3D 모델링 버튼 표시
    renderBtn.style.display = 'none';
    goToModelingBtn.style.display = 'block';
    resultActions.style.display = 'flex';
    
  } catch (err) {
    console.error('렌더링 오류:', err);
    showError(err instanceof Error ? err.message : '렌더링 중 알 수 없는 오류가 발생했습니다.');
  } finally {
    renderBtn.disabled = false;
    renderBtn.innerHTML = '🎨 렌더링하기';
  }
}

// 이미지 다운로드
function handleDownload() {
  if (!generatedImageUrl) {
    showError('다운로드할 이미지가 없습니다.');
    return;
  }
  
  try {
    // Base64 이미지를 Blob으로 변환
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `vention-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('이미지가 다운로드되었습니다.');
  } catch (err) {
    console.error('다운로드 오류:', err);
    showError('이미지 다운로드 중 오류가 발생했습니다.');
  }
}

