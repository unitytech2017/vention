// 교사 모니터링 페이지 스크립트
import { db, auth } from './firebaseConfig.js';
import { collection, query, getDocs, orderBy, deleteDoc, doc, where, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// 관리자 UID (환경변수에서 가져오기)
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID?.trim();

// 상태 관리
let allConversations = [];
let selectedDates = new Set();
let selectedConversation = null;

// DOM 요소
const dateFilterList = document.getElementById('dateFilterList');
const userList = document.getElementById('userList');
const conversationContent = document.getElementById('conversationContent');
const evaluationContent = document.getElementById('evaluationContent');
const monitorLayout = document.querySelector('.monitor-layout');

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('교사 모니터링 페이지 초기화');
  
  // 인증 상태 확인
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // 로그인하지 않은 경우
      showAccessDenied('로그인이 필요합니다.');
      return;
    }
    
    // 관리자 권한 확인
    if (!ADMIN_UID || user.uid !== ADMIN_UID) {
      // 관리자가 아닌 경우
      showAccessDenied('관리자만 접근할 수 있는 페이지입니다.');
      return;
    }
    
    // 관리자인 경우 정상적으로 페이지 로드
    console.log('관리자 인증 완료');
    await loadAllConversations();
  });
});

// 접근 거부 메시지 표시
function showAccessDenied(message) {
  if (monitorLayout) {
    monitorLayout.innerHTML = `
      <div class="access-denied-container">
        <div class="access-denied-content">
          <h2>⚠️ 접근 권한 없음</h2>
          <p>${message}</p>
          <a href="index.html" class="btn btn-primary">홈으로 돌아가기</a>
        </div>
      </div>
    `;
  }
}

// 모든 대화 데이터 불러오기
async function loadAllConversations() {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(conversationsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    allConversations = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      allConversations.push({
        id: docSnapshot.id,
        ...data
      });
    });
    
    console.log(`총 ${allConversations.length}개의 대화 데이터를 불러왔습니다.`);
    
    // 날짜 목록 생성
    generateDateFilter();
    
  } catch (error) {
    console.error('대화 데이터 불러오기 오류:', error);
    dateFilterList.innerHTML = '<p class="error-text">데이터를 불러오는 중 오류가 발생했습니다.</p>';
  }
}

// 날짜 필터 생성
function generateDateFilter() {
  // 모든 대화에서 날짜 추출
  const dateSet = new Set();
  
  allConversations.forEach(conv => {
    if (conv.createdAt) {
      const date = conv.createdAt.toDate ? conv.createdAt.toDate() : new Date(conv.createdAt.seconds * 1000);
      const dateStr = formatDate(date);
      dateSet.add(dateStr);
    }
  });
  
  // 날짜를 내림차순으로 정렬
  const sortedDates = Array.from(dateSet).sort((a, b) => {
    return new Date(b) - new Date(a);
  });
  
  if (sortedDates.length === 0) {
    dateFilterList.innerHTML = '<p class="empty-text">데이터가 없습니다</p>';
    return;
  }
  
  // 체크박스 생성
  dateFilterList.innerHTML = sortedDates.map(dateStr => {
    return `
      <label class="date-checkbox-label">
        <input type="checkbox" class="date-checkbox" value="${dateStr}" />
        <span>${dateStr}</span>
      </label>
    `;
  }).join('');
  
  // 체크박스 이벤트 리스너 추가
  const checkboxes = dateFilterList.querySelectorAll('.date-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', handleDateFilterChange);
  });
}

// 날짜 필터 변경 핸들러
function handleDateFilterChange() {
  selectedDates.clear();
  const checkboxes = dateFilterList.querySelectorAll('.date-checkbox:checked');
  checkboxes.forEach(checkbox => {
    selectedDates.add(checkbox.value);
  });
  
  // 사용자 목록 업데이트
  updateUserList();
}

// 사용자 목록 업데이트
function updateUserList() {
  if (selectedDates.size === 0) {
    userList.innerHTML = '<p class="empty-text">날짜를 선택해주세요</p>';
    conversationContent.innerHTML = '<div class="empty-state"><p>좌측에서 사용자를 선택해주세요</p></div>';
    evaluationContent.innerHTML = '<div class="empty-state"><p>좌측에서 사용자를 선택해주세요</p></div>';
    return;
  }
  
  // 선택된 날짜의 대화만 필터링
  const filteredConversations = allConversations.filter(conv => {
    if (!conv.createdAt) return false;
    const date = conv.createdAt.toDate ? conv.createdAt.toDate() : new Date(conv.createdAt.seconds * 1000);
    const dateStr = formatDate(date);
    return selectedDates.has(dateStr);
  });
  
  if (filteredConversations.length === 0) {
    userList.innerHTML = '<p class="empty-text">선택한 날짜에 데이터가 없습니다</p>';
    return;
  }
  
  // 사용자 목록 생성
  userList.innerHTML = filteredConversations.map(conv => {
    const date = conv.createdAt.toDate ? conv.createdAt.toDate() : new Date(conv.createdAt.seconds * 1000);
    const dateStr = formatDate(date);
    const timeStr = formatTime(date);
    const userName = conv.userEmail ? conv.userEmail.split('@')[0] : '익명 사용자';
    
    return `
      <div class="user-item" data-conversation-id="${conv.id}">
        <div class="user-item-content">
          <span class="user-name">${userName}</span>
          <span class="user-date">(${dateStr}, ${timeStr})</span>
        </div>
        <button class="delete-btn" data-conversation-id="${conv.id}" title="삭제">
          🗑️
        </button>
      </div>
    `;
  }).join('');
  
  // 사용자 아이템 클릭 이벤트
  const userItems = userList.querySelectorAll('.user-item');
  userItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // 삭제 버튼 클릭이 아닌 경우에만
      if (!e.target.classList.contains('delete-btn')) {
        const conversationId = item.dataset.conversationId;
        selectConversation(conversationId);
      }
    });
  });
  
  // 삭제 버튼 이벤트
  const deleteButtons = userList.querySelectorAll('.delete-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const conversationId = btn.dataset.conversationId;
      await deleteConversation(conversationId);
    });
  });
}

// 대화 선택
function selectConversation(conversationId) {
  const conversation = allConversations.find(c => c.id === conversationId);
  if (!conversation) return;
  
  selectedConversation = conversation;
  
  // 선택된 아이템 하이라이트
  const userItems = userList.querySelectorAll('.user-item');
  userItems.forEach(item => {
    if (item.dataset.conversationId === conversationId) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  // 대화 내용 표시
  displayConversation(conversation);
  
  // 평가 내용 표시
  displayEvaluation(conversation);
}

// 대화 내용 표시
function displayConversation(conversation) {
  if (!conversation.conversationHistory || conversation.conversationHistory.length === 0) {
    conversationContent.innerHTML = '<div class="empty-state"><p>대화 내용이 없습니다</p></div>';
    return;
  }
  
  const conversationHTML = `
    <div class="conversation-header">
      <div class="conversation-info">
        <p><strong>초기 아이디어:</strong> ${conversation.initialIdea || '없음'}</p>
        <p><strong>대화 턴 수:</strong> ${conversation.turnCount || 0}</p>
        <p><strong>소요 시간:</strong> ${formatDuration(conversation.conversationDuration || 0)}</p>
      </div>
    </div>
    <div class="conversation-messages">
      ${conversation.conversationHistory.map(msg => {
        const sender = msg.role === 'user' ? '학생' : '창의성 코치';
        const senderClass = msg.role === 'user' ? 'user' : 'bot';
        return `
          <div class="conversation-message ${senderClass}">
            <div class="message-sender">${sender}</div>
            <div class="message-text">${escapeHtml(msg.content)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  conversationContent.innerHTML = conversationHTML;
}

// 평가 내용 표시
function displayEvaluation(conversation) {
  if (!conversation.evaluation) {
    evaluationContent.innerHTML = '<div class="empty-state"><p>평가 내용이 없습니다</p></div>';
    return;
  }
  
  const evaluationHTML = `
    <div class="evaluation-text">
      ${formatEvaluationText(conversation.evaluation)}
    </div>
  `;
  
  evaluationContent.innerHTML = evaluationHTML;
}

// 대화 삭제
async function deleteConversation(conversationId) {
  if (!confirm('이 대화를 삭제하시겠습니까?')) {
    return;
  }
  
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await deleteDoc(conversationRef);
    
    // 로컬 데이터에서도 제거
    allConversations = allConversations.filter(c => c.id !== conversationId);
    
    // 선택된 대화가 삭제된 경우 초기화
    if (selectedConversation && selectedConversation.id === conversationId) {
      selectedConversation = null;
      conversationContent.innerHTML = '<div class="empty-state"><p>좌측에서 사용자를 선택해주세요</p></div>';
      evaluationContent.innerHTML = '<div class="empty-state"><p>좌측에서 사용자를 선택해주세요</p></div>';
    }
    
    // 날짜 필터 및 사용자 목록 업데이트
    generateDateFilter();
    updateUserList();
    
    console.log('대화가 삭제되었습니다:', conversationId);
    
  } catch (error) {
    console.error('대화 삭제 오류:', error);
    alert('대화 삭제 중 오류가 발생했습니다.');
  }
}

// 유틸리티 함수들
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}초`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}분 ${secs}초`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatEvaluationText(text) {
  // 줄바꿈을 <br>로 변환하고, 마크다운 스타일 포맷팅
  let formatted = escapeHtml(text);
  // 숫자. 패턴을 강조
  formatted = formatted.replace(/(\d+)\.\s+\*\*([^*]+)\*\*/g, '<h4>$1. $2</h4>');
  // **텍스트**를 강조
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 줄바꿈 처리
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
}
