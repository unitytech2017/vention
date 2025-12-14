// index.html 메인 페이지 스크립트
import { auth } from './firebaseConfig.js';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { initAuth, isAdmin } from './auth.js';

console.log('Vention 메인 페이지 로드됨');

// DOM 요소
const loginSection = document.getElementById('loginSection');
const authenticatedContent = document.getElementById('authenticatedContent');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('메인 페이지 초기화 완료');
  
  // 사이드바 업데이트를 위한 initAuth 호출
  initAuth();
  
  // 인증 상태 변경 감지
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 로그인 상태
      handleUserLogin(user);
    } else {
      // 로그아웃 상태
      handleUserLogout();
    }
  });

  // Google 로그인 버튼 이벤트
  googleLoginBtn.addEventListener('click', signInWithGoogle);

  // 로그아웃 버튼 이벤트
  logoutBtn.addEventListener('click', handleLogout);
});

// Google 로그인
async function signInWithGoogle() {
  try {
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = '<span>로그인 중...</span>';
    
    // Firebase 설정 확인
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    
    if (!apiKey || !authDomain) {
      throw new Error('Firebase 설정이 완료되지 않았습니다. .env 파일을 확인해주세요.');
    }
    
    const result = await signInWithPopup(auth, googleProvider);
    console.log('로그인 성공:', result.user);
    
    // handleUserLogin은 onAuthStateChanged에서 자동 호출됨
  } catch (error) {
    console.error('로그인 오류:', error);
    console.error('오류 코드:', error.code);
    console.error('오류 메시지:', error.message);
    
    let errorMessage = '로그인 중 오류가 발생했습니다.';
    
    if (error.code === 'auth/popup-blocked') {
      errorMessage = '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = '로그인 창이 닫혔습니다. 다시 시도해주세요.';
    } else if (error.code === 'auth/internal-error') {
      errorMessage = 'Firebase 설정 오류입니다. 관리자에게 문의하세요.';
      console.error('Firebase 설정 확인:', {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '설정됨' : '없음',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '설정됨' : '없음',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '설정됨' : '없음'
      });
    } else {
      errorMessage = `로그인 중 오류가 발생했습니다: ${error.message}`;
    }
    
    alert(errorMessage);
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      <span>Google로 시작하기</span>
    `;
  }
}

// 사용자 로그인 처리
function handleUserLogin(user) {
  console.log('사용자 로그인:', user);
  
  // 사용자 이름 표시
  userName.textContent = user.displayName || user.email || '사용자';
  
  // UI 전환
  loginSection.style.display = 'none';
  authenticatedContent.style.display = 'block';
  
  // 사이드바의 학생용 탭들 표시
  const studentNavItems = document.getElementById('studentNavItems');
  if (studentNavItems) {
    studentNavItems.style.display = 'block';
  }
}

// 사용자 로그아웃 처리
function handleUserLogout() {
  console.log('사용자 로그아웃');
  
  // UI 전환
  loginSection.style.display = 'block';
  authenticatedContent.style.display = 'none';
  
  // 사이드바의 학생용 탭들 숨김
  const studentNavItems = document.getElementById('studentNavItems');
  if (studentNavItems) {
    studentNavItems.style.display = 'none';
  }
}

// 로그아웃
async function handleLogout() {
  try {
    await signOut(auth);
    console.log('로그아웃 성공');
    // handleUserLogout은 onAuthStateChanged에서 자동 호출됨
  } catch (error) {
    console.error('로그아웃 오류:', error);
    alert(`로그아웃 중 오류가 발생했습니다: ${error.message}`);
  }
}
