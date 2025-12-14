// Meshy API 서비스
const API_BASE_URL = 'https://api.meshy.ai/openapi/v1';

/**
 * Meshy API 작업 생성
 * @param {string} imageUrl - 공개적으로 접근 가능한 이미지 URL 또는 Data URI
 * @param {string} apiKey - Meshy API 키 (선택사항, 없으면 .env에서 가져옴)
 * @returns {Promise<string>} Task ID
 */
export async function createMeshyTask(imageUrl, apiKey = null) {
  const finalApiKey = apiKey || import.meta.env.VITE_MESHY_API_KEY;
  
  if (!finalApiKey) {
    throw new Error('Meshy API 키가 설정되지 않았습니다. API 키를 입력하거나 .env 파일에 VITE_MESHY_API_KEY를 추가해주세요.');
  }

  try {
    // Data URI를 사용하는 경우, 임시로 Blob URL로 변환하거나
    // 실제로는 공개 URL이 필요할 수 있습니다.
    // Meshy API는 공개 URL을 선호하지만, 일부 설정에서는 Data URI도 허용할 수 있습니다.
    let finalImageUrl = imageUrl;
    
    // Data URI인 경우 처리 (필요시)
    if (imageUrl.startsWith('data:')) {
      // Data URI를 그대로 전송 (API가 지원하는 경우)
      // 또는 임시 서버에 업로드 필요
      finalImageUrl = imageUrl;
    }

    const response = await fetch(`${API_BASE_URL}/image-to-3d`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: finalImageUrl,
        enable_pbr: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.result; // Task ID
  } catch (error) {
    console.error('Meshy 작업 생성 오류:', error);
    throw error;
  }
}

/**
 * Meshy 작업 상태 확인
 * @param {string} taskId - Task ID
 * @param {string} apiKey - Meshy API 키 (선택사항, 없으면 .env에서 가져옴)
 * @returns {Promise<Object>} 작업 상태 정보
 */
export async function getMeshyTask(taskId, apiKey = null) {
  const finalApiKey = apiKey || import.meta.env.VITE_MESHY_API_KEY;
  
  if (!finalApiKey) {
    throw new Error('Meshy API 키가 설정되지 않았습니다.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/image-to-3d/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Meshy 작업 상태 확인 오류:', error);
    throw error;
  }
}

