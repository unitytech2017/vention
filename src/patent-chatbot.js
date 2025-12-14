// AI 변리사 페이지 스크립트
import './styles.css';

// Chart.js 설정
let industrialChart = null;

// 챗봇 상태
let chatbotOpen = false;
let chatbotHistory = [];

// DOM 요소
const chatbotPopup = document.getElementById('chatbotPopup');
const chatbotToggleBtn = document.getElementById('chatbotToggleBtn');
const chatbotCloseBtn = document.getElementById('chatbotCloseBtn');
const chatbotMessages = document.getElementById('chatbotMessages');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSendBtn = document.getElementById('chatbotSendBtn');

// 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 지식재산권 전문 AI 변리사입니다. 사용자의 질문에 대해 정확하고 이해하기 쉬운 답변을 제공해주세요.

# 역할
- 지식재산권(특허, 실용신안, 디자인, 상표, 저작권 등)에 대한 전문 지식을 바탕으로 답변
- 복잡한 법적 개념을 학생들이 이해하기 쉽게 설명
- 구체적인 예시를 들어 설명
- 친절하고 전문적인 톤 유지

# 답변 원칙
1. 정확한 정보 제공
2. 이해하기 쉬운 설명`;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('AI 변리사 페이지 초기화 완료');
  
  // 차트 초기화
  initChart();
  
  // 챗봇 이벤트 리스너
  chatbotToggleBtn?.addEventListener('click', toggleChatbot);
  chatbotCloseBtn?.addEventListener('click', closeChatbot);
  chatbotSendBtn?.addEventListener('click', sendChatbotMessage);
  chatbotInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatbotMessage();
    }
  });
});

// 차트 초기화
function initChart() {
  const ctx = document.getElementById('industrialChart');
  if (!ctx) return;

  const processedLabels = ['특허권\n(Patent)', '실용신안권\n(Utility)', '디자인권\n(Design)', '상표권\n(Trademark)'];

  industrialChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: processedLabels,
      datasets: [{
        label: '보호 기간 (년)',
        data: [20, 10, 20, 10],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(139, 92, 246)',
          'rgb(245, 158, 11)'
        ],
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterBody: function(tooltipItems) {
              if (tooltipItems[0].dataIndex === 3) {
                return '\n* 10년마다 갱신 가능 (반영구적)';
              }
              if (tooltipItems[0].dataIndex === 0) {
                return '\n* 출원일로부터 20년';
              }
            }
          },
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          padding: 12,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 25,
          grid: { color: '#E5E7EB' },
          title: { display: true, text: '보호 기간 (년)' }
        },
        y: {
          grid: { display: false },
          ticks: { font: { weight: 'bold' } }
        }
      }
    }
  });
}

// 챗봇 토글
function toggleChatbot() {
  chatbotOpen = !chatbotOpen;
  if (chatbotOpen) {
    chatbotPopup?.classList.add('active');
    chatbotInput?.focus();
  } else {
    chatbotPopup?.classList.remove('active');
  }
}

// 챗봇 닫기
function closeChatbot() {
  chatbotOpen = false;
  chatbotPopup?.classList.remove('active');
}

// 챗봇 메시지 전송
async function sendChatbotMessage() {
  const message = chatbotInput?.value.trim();
  if (!message) return;

  // 사용자 메시지 표시
  addChatbotMessage('user', message);
  chatbotHistory.push({ role: 'user', content: message });
  chatbotInput.value = '';

  // 로딩 표시
  const loadingId = addChatbotLoading();

  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      removeChatbotLoading(loadingId);
      addChatbotMessage('bot', '⚠️ OpenAI API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 설정해주세요.');
      return;
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...chatbotHistory
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
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API 요청 실패');
    }

    const data = await response.json();
    const botMessage = data.choices[0].message.content;

    removeChatbotLoading(loadingId);
    addChatbotMessage('bot', botMessage);
    chatbotHistory.push({ role: 'assistant', content: botMessage });

  } catch (error) {
    console.error('챗봇 응답 오류:', error);
    removeChatbotLoading(loadingId);
    addChatbotMessage('bot', `⚠️ 오류가 발생했습니다: ${error.message}`);
  }
}

// 챗봇 메시지 추가
function addChatbotMessage(sender, content) {
  if (!chatbotMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chatbot-message chatbot-message-${sender}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'chatbot-message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(contentDiv);
  chatbotMessages.appendChild(messageDiv);
  
  // 스크롤을 맨 아래로
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// 로딩 메시지 추가
function addChatbotLoading() {
  if (!chatbotMessages) return null;

  const loadingId = 'loading-' + Date.now();
  const messageDiv = document.createElement('div');
  messageDiv.id = loadingId;
  messageDiv.className = 'chatbot-message chatbot-message-bot';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'chatbot-message-content chatbot-loading';
  contentDiv.innerHTML = '<span class="chatbot-loading-dot"></span><span class="chatbot-loading-dot"></span><span class="chatbot-loading-dot"></span>';
  
  messageDiv.appendChild(contentDiv);
  chatbotMessages.appendChild(messageDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  
  return loadingId;
}

// 로딩 메시지 제거
function removeChatbotLoading(loadingId) {
  if (!loadingId) return;
  const loadingElement = document.getElementById(loadingId);
  if (loadingElement) {
    loadingElement.remove();
  }
}

