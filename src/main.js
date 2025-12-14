// student.html 학생 활동 페이지 스크립트
import './styles.css';
import { db, auth } from './firebaseConfig.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 상태 관리
let conversationHistory = [];
let currentTurn = 0;
const MAX_TURNS = 3;
let userIdea = '';
let conversationStartTime = null;

// DOM 요소
const ideaInputSection = document.getElementById('ideaInputSection');
const chatSection = document.getElementById('chatSection');
const ideaInput = document.getElementById('ideaInput');
const startChatBtn = document.getElementById('startChatBtn');
const chatMessages = document.getElementById('chatMessages');
const userMessage = document.getElementById('userMessage');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const turnCounter = document.getElementById('turnCounter');
const chatInputArea = document.getElementById('chatInputArea');
const evaluationSection = document.getElementById('evaluationSection');
const evaluateBtn = document.getElementById('evaluateBtn');
const evaluationResult = document.getElementById('evaluationResult');
const evaluationContent = document.getElementById('evaluationContent');

// 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 학생들의 발명 아이디어를 발전시켜주는 '창의성 코치'입니다. 학생이 아이디어를 이야기하면 질문을 통해 아이디어를 더 구체적이고 독창적으로 다듬도록 도와주세요.

# 대화 원칙

1. **평가 금지:** 절대 아이디어에 대해 좋다/나쁘다 평가하지 마세요. 오직 호기심을 가지고 질문만 하세요.

2. **질문은 한 번에 하나만:** 학생이 생각할 시간을 주기 위해 질문은 한 번에 하나씩만 합니다.

3. **SCAMPER 기법 활용:** 다음 관점 중 하나를 골라 질문하세요.
   - 대체(Substitute): 재료나 대상을 바꾸면?
   - 결합(Combine): 다른 기능과 합치면?
   - 응용(Adapt): 다른 분야의 아이디어를 가져오면?
   - 수정/확대/축소(Modify): 크기나 형태를 바꾸면?
   - 용도 변경(Put to other use): 다른 용도로 쓴다면?
   - 제거(Eliminate): 불필요한 부분을 없애면?
   - 재배치(Reverse): 순서나 모양을 뒤집으면?

친근하고 격려하는 톤으로 대화하세요.`;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('학생 활동 페이지 초기화 완료');
  
  // 이벤트 리스너 설정
  startChatBtn.addEventListener('click', startConversation);
  sendMessageBtn.addEventListener('click', sendUserMessage);
  evaluateBtn.addEventListener('click', evaluateIdea);
  
  // Enter 키로 전송 (Shift+Enter는 줄바꿈)
  userMessage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  });
});

// 대화 시작
async function startConversation() {
  const idea = ideaInput.value.trim();
  
  if (!idea) {
    alert('발명 아이디어를 입력해주세요.');
    return;
  }
  
  userIdea = idea;
  currentTurn = 0;
  conversationHistory = [];
  conversationStartTime = Date.now(); // 대화 시작 시간 기록
  
  // UI 전환
  ideaInputSection.style.display = 'none';
  chatSection.style.display = 'flex';
  chatMessages.innerHTML = '';
  
  // 초기 메시지 추가
  addMessage('user', idea);
  conversationHistory.push({ role: 'user', content: idea });
  
  // 챗봇 첫 질문 받기
  await getBotResponse();
}

// 사용자 메시지 전송
async function sendUserMessage() {
  const message = userMessage.value.trim();
  
  if (!message) {
    return;
  }
  
  if (currentTurn >= MAX_TURNS) {
    alert('3턴의 대화가 완료되었습니다. 아이디어 평가를 진행해주세요.');
    return;
  }
  
  // 사용자 메시지 추가
  addMessage('user', message);
  conversationHistory.push({ role: 'user', content: message });
  userMessage.value = '';
  
  currentTurn++;
  updateTurnCounter();
  
  // 챗봇 응답 받기
  await getBotResponse();
}

// 챗봇 응답 받기
async function getBotResponse() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    addMessage('bot', '⚠️ OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 설정해주세요.');
    return;
  }
  
  // 로딩 표시
  const loadingId = addLoadingMessage();
  
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory
    ];
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API 요청 실패');
    }
    
    const data = await response.json();
    const botMessage = data.choices[0].message.content;
    
    // 로딩 메시지 제거하고 실제 응답 추가
    removeLoadingMessage(loadingId);
    addMessage('bot', botMessage);
    conversationHistory.push({ role: 'assistant', content: botMessage });
    
    // 3턴 완료 시 평가 버튼 표시
    if (currentTurn >= MAX_TURNS) {
      chatInputArea.style.display = 'none';
      evaluationSection.style.display = 'block';
    }
    
  } catch (error) {
    console.error('챗봇 응답 오류:', error);
    removeLoadingMessage(loadingId);
    addMessage('bot', `⚠️ 오류가 발생했습니다: ${error.message}`);
  }
}

// 메시지 추가
function addMessage(sender, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = sender === 'user' ? '나' : '창의성 코치';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // 스크롤을 맨 아래로
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv;
}

// 로딩 메시지 추가
function addLoadingMessage() {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  messageDiv.id = 'loading-message';
  
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = '창의성 코치';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = '<span class="loading"></span> 생각 중...';
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return 'loading-message';
}

// 로딩 메시지 제거
function removeLoadingMessage(id) {
  const loadingMsg = document.getElementById(id);
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

// 턴 카운터 업데이트
function updateTurnCounter() {
  turnCounter.textContent = `${currentTurn} / ${MAX_TURNS}`;
}

// 아이디어 평가
async function evaluateIdea() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    alert('⚠️ OpenAI API 키가 설정되지 않았습니다.');
    return;
  }
  
  evaluateBtn.disabled = true;
  evaluateBtn.textContent = '평가 중...';
  
  try {
    // 대화 내용을 요약하여 평가 요청
    const conversationSummary = conversationHistory
      .map(msg => `${msg.role === 'user' ? '학생' : '코치'}: ${msg.content}`)
      .join('\n');
    
    const evaluationPrompt = `다음은 학생의 발명 아이디어와 창의성 코치와의 대화 내용입니다.

**초기 아이디어:**
${userIdea}

**대화 내용:**
${conversationSummary}

위 대화를 바탕으로 학생의 발명 아이디어를 평가해주세요. 다음 항목들을 포함하여 평가해주세요:

1. **아이디어의 독창성** (1-10점)
2. **실현 가능성** (1-10점)
3. **구체성** (1-10점)
4. **개선된 점** (대화를 통해 어떻게 발전되었는지)
5. **추가 제안사항** (더 발전시킬 수 있는 방향)

친근하고 격려하는 톤으로 작성해주세요.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '당신은 발명 교육 전문가입니다. 학생들의 아이디어를 건설적이고 격려하는 방식으로 평가합니다.' },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '평가 요청 실패');
    }
    
    const data = await response.json();
    const evaluation = data.choices[0].message.content;
    
    // 평가 결과 표시
    evaluationContent.textContent = evaluation;
    evaluationResult.style.display = 'block';
    evaluationSection.style.display = 'none';
    
    // 스크롤을 평가 결과로
    evaluationResult.scrollIntoView({ behavior: 'smooth' });
    
    // Firebase에 대화 내용 저장
    await saveConversationToFirebase(evaluation);
    
  } catch (error) {
    console.error('평가 오류:', error);
    alert(`⚠️ 평가 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    evaluateBtn.disabled = false;
    evaluateBtn.textContent = '아이디어 평가하기';
  }
}

// Firebase에 대화 내용 저장
async function saveConversationToFirebase(evaluation) {
  try {
    // 대화 소요 시간 계산 (밀리초를 초로 변환)
    const conversationDuration = conversationStartTime 
      ? Math.round((Date.now() - conversationStartTime) / 1000) 
      : 0;
    
    // 현재 사용자 정보 가져오기
    const user = auth.currentUser;
    const userId = user ? user.uid : 'anonymous';
    const userEmail = user ? user.email : null;
    
    // Firestore에 저장할 데이터
    const conversationData = {
      userId: userId,
      userEmail: userEmail,
      initialIdea: userIdea,
      conversationHistory: conversationHistory,
      evaluation: evaluation,
      conversationDuration: conversationDuration, // 초 단위
      createdAt: serverTimestamp(),
      turnCount: currentTurn
    };
    
    // Firestore에 저장
    const docRef = await addDoc(collection(db, 'conversations'), conversationData);
    console.log('대화 내용이 Firebase에 저장되었습니다. 문서 ID:', docRef.id);
    
  } catch (error) {
    console.error('Firebase 저장 오류:', error);
    // 저장 실패해도 사용자에게는 알리지 않음 (평가는 이미 완료되었으므로)
  }
}
