'use client';

import { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useLiteMode } from '../contexts/LiteModeContext';

interface ColumnConfig {
  key: string;
  label: string;
  width: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
}

interface TableData {
  id: string;
  type: 'contribution' | 'loan' | 'repayment';
  amount: number;
  member: string;
  date: string;
}

interface VirtualizedTableProps {
  data: TableData[];
  isLiteMode: boolean;
}

const ROW_HEIGHT = 60;
const TABLE_HEIGHT = 400;

export function VirtualizedTable({ data, isLiteMode }: VirtualizedTableProps) {
  // Memoize formatted data to prevent unnecessary recalculations
  const formattedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedAmount: new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
      }).format(item.amount),
      formattedDate: new Date(item.date).toLocaleDateString('en-KE'),
    }));
  }, [data]);

  // Memoize columns configuration
  const columns = useMemo<ColumnConfig[]>(() => {
    if (isLiteMode) {
      return [
        { key: 'type', label: 'Type', width: 100 },
        { key: 'member', label: 'Member', width: 150 },
        { key: 'formattedAmount', label: 'Amount', width: 120 },
      ];
    }
    
    return [
      { key: 'type', label: 'Type', width: 120 },
      { key: 'member', label: 'Member', width: 200 },
      { key: 'formattedAmount', label: 'Amount', width: 150 },
      { key: 'formattedDate', label: 'Date', width: 120 },
    ];
  }, [isLiteMode]);

  // Memoize row renderer for performance
  const Row = useCallback(({ index, style }: RowProps) => {
    const item = formattedData[index];
    
    return (
      <div 
        style={style}
        className={`flex items-center border-b border-gray-200 hover:bg-gray-50 transition-colors ${
          isLiteMode ? 'text-sm' : ''
        }`}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            style={{ width: column.width }}
            className="px-4 py-3 truncate"
          >
            {column.key === 'type' && (
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                item.type === 'contribution' ? 'bg-green-100 text-green-800' :
                item.type === 'loan' ? 'bg-blue-100 text-blue-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {item.type}
              </span>
            )}
            {column.key !== 'type' && item[column.key as keyof typeof item]}
          </div>
        ))}
      </div>
    );
  }, [formattedData, columns, isLiteMode]);

  if (!data.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recent activity found
      </div>
    );
  }

  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${isLiteMode ? 'lite-table' : ''}`}>
      {/* Table Header */}
      <div className="flex bg-gray-50 border-b border-gray-200" style={{ width: tableWidth }}>
        {columns.map((column) => (
          <div
            key={column.key}
            style={{ width: column.width }}
            className="px-4 py-3 font-semibold text-gray-700 text-sm"
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* Virtualized Table Body */}
      <div style={{ width: tableWidth, overflow: 'auto' }}>
        <List
          height={TABLE_HEIGHT}
          width={tableWidth}
          itemCount={formattedData.length}
          itemSize={ROW_HEIGHT}
          itemData={formattedData}
          overscanCount={5} // Render 5 extra rows for smooth scrolling
          className="virtualized-table"
        >
          {Row}
        </List>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        Showing {data.length} recent transactions
      </div>
    </div>
  );
}
