// intent: 거래 파라미터 UI 컨트롤러
import { elements } from '../core/dom-utils.js';

// 파라미터 상태
const paramState = {
  size: 25,
  leverage: 20,
};

// 거래 파라미터 초기화
export function initializeTradeParams() {
  bindSliderEvents();
  bindPresetEvents();
  updateAllDisplays();
}

// 입력 필드 이벤트 바인딩
function bindSliderEvents() {
  const sizeInput = document.getElementById('sizePercent');
  const leverageInput = document.getElementById('leverage');

  if (sizeInput) {
    sizeInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value) || 0;
      // 범위 제한
      value = Math.max(1, Math.min(100, value));
      paramState.size = value;

      updateSizeProgress();
      updateSizePresets();
      updateSizeColor();

      // 기존 함수 호출 (호환성)
      if (window.updateSizePreview) {
        window.updateSizePreview();
      }
    });

    // 포커스 아웃 시 값 정리
    sizeInput.addEventListener('blur', (e) => {
      if (!e.target.value || e.target.value < 1) {
        e.target.value = 1;
        paramState.size = 1;
        updateSizeProgress();
        updateSizePresets();
        updateSizeColor();
      }
    });
  }

  if (leverageInput) {
    leverageInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value) || 0;
      // 범위 제한
      value = Math.max(1, Math.min(25, value));
      paramState.leverage = value;

      updateLeverageProgress();
      updateLeveragePresets();
      updateLeverageColor();

      // 기존 함수 호출 (호환성)
      if (window.updateLeverageDisplay) {
        window.updateLeverageDisplay();
      }
    });

    // 포커스 아웃 시 값 정리
    leverageInput.addEventListener('blur', (e) => {
      if (!e.target.value || e.target.value < 1) {
        e.target.value = 1;
        paramState.leverage = 1;
        updateLeverageProgress();
        updateLeveragePresets();
        updateLeverageColor();
      }
    });
  }
}

// 프리셋 버튼 이벤트 바인딩
function bindPresetEvents() {
  // Size 프리셋
  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const size = parseInt(e.target.dataset.size);
      setSizeValue(size);
    });
  });

  // Leverage 프리셋
  document.querySelectorAll('[data-leverage]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const leverage = parseInt(e.target.dataset.leverage);
      setLeverageValue(leverage);
    });
  });
}

// Size 값 설정
function setSizeValue(value) {
  paramState.size = value;
  const input = document.getElementById('sizePercent');
  if (input) input.value = value;

  updateSizeProgress();
  updateSizePresets();
  updateSizeColor();

  if (window.updateSizePreview) {
    window.updateSizePreview();
  }
}

// Leverage 값 설정
function setLeverageValue(value) {
  paramState.leverage = value;
  const input = document.getElementById('leverage');
  if (input) input.value = value;

  updateLeverageProgress();
  updateLeveragePresets();
  updateLeverageColor();

  if (window.updateLeverageDisplay) {
    window.updateLeverageDisplay();
  }
}

// Size 색상 업데이트
function updateSizeColor() {
  const input = document.getElementById('sizePercent');
  if (!input) return;

  const value = paramState.size;
  let intensity;

  if (value <= 20) {
    intensity = 'low';
  } else if (value <= 40) {
    intensity = 'medium-low';
  } else if (value <= 60) {
    intensity = 'medium';
  } else if (value <= 80) {
    intensity = 'medium-high';
  } else {
    intensity = 'high';
  }

  // 기존 intensity 클래스 제거
  input.removeAttribute('data-intensity');
  input.setAttribute('data-intensity', intensity);
}

// Leverage 색상 업데이트
function updateLeverageColor() {
  const input = document.getElementById('leverage');
  if (!input) return;

  const value = paramState.leverage;
  let intensity;

  if (value <= 5) {
    intensity = 'low';
  } else if (value <= 10) {
    intensity = 'medium-low';
  } else if (value <= 15) {
    intensity = 'medium';
  } else if (value <= 20) {
    intensity = 'medium-high';
  } else {
    intensity = 'high';
  }

  // 기존 intensity 클래스 제거
  input.removeAttribute('data-intensity');
  input.setAttribute('data-intensity', intensity);
}

// 기존 함수들 (호환성 유지)
function updateSizeDisplay() {
  const display = document.getElementById('sizeDisplay');
  if (display) {
    display.textContent = `${paramState.size}%`;
  }
}

function updateLeverageDisplay() {
  const display = document.getElementById('leverageDisplay');
  if (display) {
    display.textContent = `${paramState.leverage}x`;
  }

  // 기존 pill 업데이트 (호환성)
  const levVal = document.getElementById('levVal');
  if (levVal) {
    levVal.textContent = `${paramState.leverage}x`;
  }
}

// Size 진행률 업데이트
function updateSizeProgress() {
  const progress = document.getElementById('sizeProgress');
  if (progress) {
    const percentage = (paramState.size / 100) * 100;
    progress.style.width = `${percentage}%`;
  }
}

// Leverage 진행률 업데이트
function updateLeverageProgress() {
  const progress = document.getElementById('leverageProgress');
  if (progress) {
    const percentage = (paramState.leverage / 25) * 100;
    progress.style.width = `${percentage}%`;
  }
}

// Size 프리셋 활성화 상태 업데이트
function updateSizePresets() {
  document.querySelectorAll('[data-size]').forEach((btn) => {
    const size = parseInt(btn.dataset.size);
    btn.classList.toggle('active', size === paramState.size);
  });
}

// Leverage 프리셋 활성화 상태 업데이트
function updateLeveragePresets() {
  document.querySelectorAll('[data-leverage]').forEach((btn) => {
    const leverage = parseInt(btn.dataset.leverage);
    btn.classList.toggle('active', leverage === paramState.leverage);
  });
}

// 모든 표시 업데이트
function updateAllDisplays() {
  updateSizeProgress();
  updateLeverageProgress();
  updateSizePresets();
  updateLeveragePresets();
  updateSizeColor();
  updateLeverageColor();
}

// 현재 값 가져오기 (외부 접근용)
export function getTradeParams() {
  return {
    size: paramState.size,
    leverage: paramState.leverage,
  };
}
