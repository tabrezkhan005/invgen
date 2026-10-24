'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId: string | number;
  onCustomerSelect: (customerId: string | number) => void;
  onAddCustomer: (name: string, phone: string) => void;
  disabled?: boolean;
}

export default function CustomerSelector({
  customers,
  selectedCustomerId,
  onCustomerSelect,
  onAddCustomer,
  disabled = false
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const selectedCustomer = customers.find((c) => c.id.toString() === selectedCustomerId.toString());

  const handleAddCustomer = () => {
    if (newCustomer.name.trim() && newCustomer.phone.trim()) {
      onAddCustomer(newCustomer.name.trim(), newCustomer.phone.trim());
      setNewCustomer({ name: '', phone: '' });
      setShowAddDialog(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-base font-semibold">Select Customer</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-11"
              disabled={disabled}
            >
              {selectedCustomer
                ? `${selectedCustomer.name} (${selectedCustomer.phone})`
                : "Search customers..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search name or phone..." />
              <CommandList>
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={`${customer.name} ${customer.phone}`}
                      onSelect={() => {
                        onCustomerSelect(customer.id);
                        setOpen(false);
                      }}
                      className="py-3"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCustomerId.toString() === customer.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-xs text-muted-foreground">{customer.phone}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" disabled={disabled}>
              <UserPlus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer profile for billing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="9876543210"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer} disabled={!newCustomer.name.trim() || !newCustomer.phone.trim()}>
                Add Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
