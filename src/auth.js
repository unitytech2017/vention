// 공통 인증 상태 관리 스크립트
import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// 관리자 UID (환경변수에서 가져오기)
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID?.trim();

// 관리자 여부 확인
export function isAdmin(user) {
  if (!user || !ADMIN_UID) return false;
  return user.uid === ADMIN_UID;
}

// 로그아웃 함수
export async function logout() {
  try {
    await signOut(auth);
    console.log('로그아웃 완료');
  } catch (error) {
    console.error('로그아웃 오류:', error);
    alert('로그아웃 중 오류가 발생했습니다.');
  }
}

// 모든 페이지에서 로그인 상태 확인 및 사이드바 업데이트
export function initAuth() {
  onAuthStateChanged(auth, (user) => {
    const studentNavItems = document.getElementById('studentNavItems');
    const teacherMonitorLink = document.getElementById('teacherMonitorLink');
    const logoutBtn = document.getElementById('sidebarLogoutBtn');
    
    if (user && studentNavItems) {
      // 로그인 상태: 학생용 탭 표시
      studentNavItems.style.display = 'block';
    } else if (studentNavItems) {
      // 로그아웃 상태: 학생용 탭 숨김
      studentNavItems.style.display = 'none';
    }
    
    // 교사 모니터링 링크: 관리자만 표시
    if (teacherMonitorLink) {
      if (user && isAdmin(user)) {
        teacherMonitorLink.style.display = 'block';
      } else {
        teacherMonitorLink.style.display = 'none';
      }
    }
    
    // 로그아웃 버튼: 로그인한 사용자에게 표시
    if (logoutBtn) {
      if (user) {
        logoutBtn.style.display = 'block';
        // 로그아웃 버튼 이벤트 리스너 (한 번만 추가)
        if (!logoutBtn.hasAttribute('data-listener-added')) {
          logoutBtn.addEventListener('click', async () => {
            await logout();
            // 현재 페이지가 teacherMonitor.html이면 index.html로 리다이렉트
            if (window.location.pathname.includes('teacherMonitor.html')) {
              window.location.href = 'index.html';
            }
          });
          logoutBtn.setAttribute('data-listener-added', 'true');
        }
      } else {
        logoutBtn.style.display = 'none';
      }
    }
  });
}

