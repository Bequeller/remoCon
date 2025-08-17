// intent: 심볼 선택기 React 컴포넌트 (검색창 형태)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { symbolsAPI } from '../../utils/api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 초기 심볼 데이터 로드
  useEffect(() => {
    const loadSymbols = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedSymbols = await symbolsAPI.fetchSymbols();
        setSymbols(fetchedSymbols);
        setFilteredSymbols(fetchedSymbols);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load symbols');
        // 에러 시 기본 심볼들로 폴백
        const fallbackSymbols: Symbol[] = [
          { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
          { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT' },
        ];
        setSymbols(fallbackSymbols);
        setFilteredSymbols(fallbackSymbols);
      } finally {
        setLoading(false);
      }
    };

    loadSymbols();
  }, []);

  // 검색 필터링 (실시간)
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
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
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

  const handleInputFocus = () => {
    setIsOpen(true);
    calculateDropdownPosition();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
      calculateDropdownPosition();
    }
  };

  return (
    <div className="symbol-selector-wrapper">
      <div className="symbol-selector" ref={dropdownRef}>
        <div className="symbol-search-container">
          <span className="selected-symbol-display">{selectedSymbol}</span>
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="symbol-search-input"
              placeholder="Search (예: BTC, ETH, USDT)"
              value={searchTerm}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              autoComplete="off"
            />
          </div>
        </div>

        {isOpen && (
          <div
            className="symbol-dropdown open"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            <div className="search-info">
              <span className="search-count">
                {filteredSymbols.length}개 심볼
                {searchTerm && ` (검색: "${searchTerm}")`}
              </span>
            </div>
            <div className="symbol-list">
              {loading ? (
                <div className="loading-indicator">Loading symbols...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : filteredSymbols.length === 0 ? (
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
