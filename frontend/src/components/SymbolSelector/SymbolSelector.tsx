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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // 키보드 네비게이션
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
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredSymbols, handleSymbolSelect]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="symbol-selector-wrapper">
      <div className="symbol-selector" ref={dropdownRef}>
        <button
          type="button"
          className="symbol-selector-btn"
          onClick={toggleDropdown}
        >
          <span className="selected-symbol">{selectedSymbol}</span>
          <span className={`selector-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="symbol-dropdown open">
            <div className="symbol-search-wrapper">
              <input
                ref={searchInputRef}
                type="text"
                className="symbol-search"
                placeholder="심볼 검색 (예: BTC, ETH)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="symbol-categories">
              <button type="button" className="category-btn active">
                USDT
              </button>
            </div>

            <div className="symbol-list">
              {filteredSymbols.length === 0 ? (
                <div className="no-symbols">검색 결과가 없습니다</div>
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
