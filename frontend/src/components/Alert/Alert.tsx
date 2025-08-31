// intent: 알람/토스트 메시지 표시 컴포넌트
import React, { useEffect, useState, useCallback } from 'react';
import './Alert.css';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertMessage {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  duration?: number;
}

interface AlertProps {
  alert: AlertMessage;
  onClose: (id: string) => void;
}

export const Alert: React.FC<AlertProps> = ({ alert, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(alert.id);
    }, 300); // 애니메이션 시간
  }, [onClose, alert.id]);

  useEffect(() => {
    // 컴포넌트 마운트 시 표시 애니메이션
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // 자동 닫기 타이머
    const duration = alert.duration || 5000; // 기본 5초
    const hideTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [alert.duration, handleClose]);

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`alert alert-${alert.type} ${
        isVisible ? 'alert-visible' : ''
      } ${isExiting ? 'alert-exiting' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="alert-icon">{getIcon(alert.type)}</div>

      <div className="alert-content">
        <div className="alert-title">{alert.title}</div>
        {alert.message && <div className="alert-message">{alert.message}</div>}
      </div>

      <button
        className="alert-close"
        onClick={handleClose}
        aria-label="알람 닫기"
      >
        ×
      </button>
    </div>
  );
};

interface AlertContainerProps {
  alerts: AlertMessage[];
  onClose: (id: string) => void;
}

export const AlertContainer: React.FC<AlertContainerProps> = ({
  alerts,
  onClose,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div className="alert-container">
      {alerts.map((alert) => (
        <Alert key={alert.id} alert={alert} onClose={onClose} />
      ))}
    </div>
  );
};
