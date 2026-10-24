'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Keyboard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface InvoiceItem {
  item_name: string;
  qty: number;
  price: number;
  amount: number;
}

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  onUpdateItem: (index: number, field: keyof InvoiceItem, value: string | number) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  disabled?: boolean;
  currencySymbol?: string;
  onKeyDown?: (e: React.KeyboardEvent, itemIndex: number, field: string) => void;
  itemRefs?: React.MutableRefObject<(HTMLInputElement | null)[]>;
}

export default function InvoiceItemsTable({
  items,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  disabled = false,
  currencySymbol = '₹',
  onKeyDown,
  itemRefs
}: InvoiceItemsTableProps) {
  // Count items with descriptions (filled items)
  const filledItemsCount = items.filter(item => item.item_name.trim()).length;
  // Calculate pages needed (25 items per page)
  const pagesNeeded = Math.ceil(items.length / 25) || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Invoice Items</h3>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
            {filledItemsCount} item{filledItemsCount !== 1 ? 's' : ''} added
          </span>
          <span className="text-sm px-2 py-1 rounded bg-primary/10 text-primary">
            {items.length} rows ({pagesNeeded} page{pagesNeeded > 1 ? 's' : ''})
          </span>
        </div>
        <Button
          type="button"
          onClick={onAddItem}
          disabled={disabled}
          size="sm"
          className="gap-2"
          title="Add new item"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[8%] text-center">S.No</TableHead>
              <TableHead className="w-[40%]">Item Description</TableHead>
              <TableHead className="text-center w-[13%]">Qty</TableHead>
              <TableHead className="text-center w-[14%]">Price</TableHead>
              <TableHead className="text-right w-[18%]">Amount</TableHead>
              <TableHead className="w-[7%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="text-center font-medium text-muted-foreground">
                  {rowIndex + 1}
                </TableCell>
                <TableCell>
                  <Input
                    ref={(el) => {
                      if (itemRefs) {
                        itemRefs.current[rowIndex * 3] = el;
                      }
                    }}
                    data-item={rowIndex}
                    data-field="item_name"
                    value={item.item_name}
                    onChange={(e) => onUpdateItem(rowIndex, 'item_name', e.target.value)}
                    onKeyDown={onKeyDown ? (e) => onKeyDown(e, rowIndex, 'item_name') : undefined}
                    placeholder="Item name or description (optional)"
                    className="h-9"
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                    <Input
                      ref={(el) => {
                        if (itemRefs) {
                          itemRefs.current[rowIndex * 3 + 1] = el;
                        }
                      }}
                      data-item={rowIndex}
                      data-field="qty"
                      type="number"
                      min="1"
                      value={item.qty === 0 ? '' : item.qty}
                      onChange={(e) => onUpdateItem(rowIndex, 'qty', e.target.value === '' ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={onKeyDown ? (e) => onKeyDown(e, rowIndex, 'qty') : undefined}
                      className="h-9 text-center"
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      ref={(el) => {
                        if (itemRefs) {
                          itemRefs.current[rowIndex * 3 + 2] = el;
                        }
                      }}
                      data-item={rowIndex}
                      data-field="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price === 0 ? '' : item.price}
                      onChange={(e) => onUpdateItem(rowIndex, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={onKeyDown ? (e) => onKeyDown(e, rowIndex, 'price') : undefined}
                      className="h-9 text-center"
                      disabled={disabled}
                    />
                  </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.amount, currencySymbol)}
                </TableCell>
                <TableCell>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(rowIndex)}
                      disabled={disabled}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Keyboard className="h-3 w-3" />
          <span>Press Enter on price field to add new item. Use arrow keys to navigate between fields.</span>
        </div>
        <div className="text-sm font-medium">
          Total Rows: <span className="text-primary">{items.length}</span>
        </div>
      </div>
    </div>
  );
}
