"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

type AdAccount = {
  id: string;
  name: string;
  accountId: string;
};

type AccountSelectorProps = {
  accounts: AdAccount[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  userPicture?: string;
};

export function AccountSelector({
  accounts,
  selectedAccountId,
  onSelectAccount,
  userPicture,
}: AccountSelectorProps) {
  const selectedAccount = accounts.find((acc) => acc.accountId === selectedAccountId);

  return (
    <Select value={selectedAccountId ?? undefined} onValueChange={onSelectAccount}>
      <SelectTrigger className="w-[180px] sm:w-[240px]">
        <SelectValue placeholder="Selecione uma conta">
          {selectedAccount && (
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                {userPicture ? (
                  <AvatarImage src={userPicture} alt={selectedAccount.name} />
                ) : null}
                <AvatarFallback className="text-xs">
                  <Building2 className="size-3" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{selectedAccount.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.accountId}>
            <div className="flex items-center gap-2">
              <Avatar className="size-5">
                {userPicture ? (
                  <AvatarImage src={userPicture} alt={account.name} />
                ) : null}
                <AvatarFallback className="text-xs">
                  <Building2 className="size-3" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm">{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  ID: {account.accountId}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

