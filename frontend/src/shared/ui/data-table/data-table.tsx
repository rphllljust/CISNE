import './data-table.css';

export interface ColumnDef<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  headerClassName?: string;
  cellClassName?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  caption?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  caption,
  onRowClick,
  rowClassName
}: DataTableProps<T>): React.JSX.Element {
  return (
    <div className="table-wrapper scroll-soft">
      <table className="table">
        {caption ? <caption className="table-caption">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key.toString()}
                className={column.headerClassName}
                style={{
                  width: column.width,
                  textAlign: column.align ?? 'left'
                }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="table-row-skeleton">
                {columns.map((column) => (
                  <td key={column.key.toString()}>
                    <div className="table-skeleton-cell" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`${onRowClick ? 'table-row-clickable' : ''} ${rowClassName?.(row) ?? ''}`.trim()}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key.toString()}
                    className={column.cellClassName}
                    style={{ textAlign: column.align ?? 'left' }}
                  >
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

