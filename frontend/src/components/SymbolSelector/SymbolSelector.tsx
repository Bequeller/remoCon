// intent: 심볼 선택기 React 컴포넌트
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SymbolSelector.css';

interface Symbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface SymbolSelectorProps {
  onSymbolChange?: (symbol: string) => void;
  initialSymbol?: string;
}

export const SymbolSelector: React.FC<SymbolSelectorProps> = ({
  onSymbolChange,
  initialSymbol = 'BTCUSDT',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [searchTerm, setSearchTerm] = useState('');
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<Symbol[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 초기 심볼 데이터 로드
  useEffect(() => {
    // 임시 데이터 (실제 API 연결 전)
    const tempSymbols: Symbol[] = [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT' },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT' },
      { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT' },
      { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT' },
      { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT' },
      { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT' },
      { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT' },
      { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT' },
      { symbol: 'ATOMUSDT', baseAsset: 'ATOM', quoteAsset: 'USDT' },
    ];
    setSymbols(tempSymbols);
    setFilteredSymbols(tempSymbols);
  }, []);

  // 검색 필터링
  useEffect(() => {
    const filtered = symbols.filter(
      (symbol) =>
        symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        symbol.baseAsset.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSymbols(filtered);
    setSelectedIndex(-1);
  }, [searchTerm, symbols]);

  const handleSymbolSelect = useCallback(
    (symbol: string) => {
      setSelectedSymbol(symbol);
      setIsOpen(false);
      setSearchTerm('');
      setSelectedIndex(-1);
      onSymbolChange?.(symbol);
    },
    [onSymbolChange]
  );

  const calculateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 300; // max-height

      let top: number;
      if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
        // 아래쪽에 공간이 충분하거나 위쪽보다 아래쪽이 더 넓을 때
        top = rect.bottom + 4;
      } else {
        // 위쪽에 배치
        top = rect.top - dropdownHeight - 4;
      }

      setDropdownPosition({
        top,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 네비게이션 및 스크롤 감지
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      // 검색 기능: 알파벳/숫자 입력 시 검색어에 추가
      if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
        event.preventDefault();
        setSearchTerm((prev) => prev + event.key.toUpperCase());
        setSelectedIndex(-1);
        return;
      }

      // 백스페이스: 검색어에서 마지막 문자 제거
      if (event.key === 'Backspace') {
        event.preventDefault();
        setSearchTerm((prev) => prev.slice(0, -1));
        setSelectedIndex(-1);
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredSymbols.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSymbols.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && filteredSymbols[selectedIndex]) {
            handleSymbolSelect(filteredSymbols[selectedIndex].symbol);
          } else if (filteredSymbols.length === 1) {
            // 검색 결과가 하나뿐이면 자동 선택
            handleSymbolSelect(filteredSymbols[0].symbol);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          break;
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        calculateDropdownPosition();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [
    isOpen,
    selectedIndex,
    filteredSymbols,
    handleSymbolSelect,
    calculateDropdownPosition,
  ]);

  const toggleDropdown = () => {
    if (!isOpen) {
      calculateDropdownPosition();
      setSearchTerm('');
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="symbol-selector-wrapper">
      <div className="symbol-selector" ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          className="symbol-selector-btn"
          onClick={toggleDropdown}
        >
          <span className="selected-symbol">{selectedSymbol}</span>
          <span className={`selector-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div
            className="symbol-dropdown open"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {searchTerm && (
              <div className="search-indicator">
                <span className="search-text">검색: {searchTerm}</span>
              </div>
            )}
            <div className="symbol-list">
              {filteredSymbols.length === 0 ? (
                <div className="no-symbols">
                  {searchTerm
                    ? `"${searchTerm}" 검색 결과가 없습니다`
                    : '심볼을 선택하세요'}
                </div>
              ) : (
                filteredSymbols.map((symbol, index) => (
                  <div
                    key={symbol.symbol}
                    className={`symbol-item ${
                      symbol.symbol === selectedSymbol ? 'selected' : ''
                    } ${index === selectedIndex ? 'highlighted' : ''}`}
                    onClick={() => handleSymbolSelect(symbol.symbol)}
                  >
                    <div className="symbol-info">
                      <span className="symbol-name">{symbol.symbol}</span>
                      <span className="symbol-desc">
                        {symbol.baseAsset}/{symbol.quoteAsset}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
