"use client";
import { useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import type { Workspace } from "@/lib/queries";
import { Button, Empty } from "./ui";
import { type Field } from "./record-form";

export type Props = {
  view: string;
  data: Workspace;
  manage: boolean;
  openForm: (
    title: string,
    command: string,
    fields: Field[],
    schema: z.ZodType,
    extra?: Record<string, unknown>,
    values?: Record<string, string>,
  ) => void;
  mutate: (command: string, data: unknown) => Promise<boolean>;
  requestConfirm: (title: string, description: string, command: string, data: unknown) => void;
  newCompany: () => void;
};
export function useOperationFilters(props: Props) {
  const { view, data, manage, openForm, mutate, requestConfirm, newCompany } = props;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [proposal, setProposal] = useState<Workspace["proposals"][number] | null>(null);
  const search = (value: string) => value.toLowerCase().includes(query.toLowerCase());
  const paginate = <T,>(rows: T[]) => rows.slice((page - 1) * 15, page * 15);
  const filters = (placeholder: string, statuses: string[] = []) => (
    <div className="filter-bar">
      <label className="search-input">
        <Search size={17} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {statuses.length > 0 && (
        <select
          aria-label="Filtrar status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      )}
      {(query || status) && (
        <Button
          variant="ghost"
          onClick={() => {
            setQuery("");
            setStatus("");
            setPage(1);
          }}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
  const empty = (
    <Empty
      filtered={!!query || !!status}
      onClear={() => {
        setQuery("");
        setStatus("");
        setPage(1);
      }}
    />
  );
  const confirm = (
    title: string,
    command: string,
    row: { id: string; updatedAt: string },
    extra: Record<string, unknown> = {},
  ) =>
    requestConfirm(title, "Esta decisão será registrada no histórico da operação.", command, {
      id: row.id,
      updatedAt: row.updatedAt,
      ...extra,
    });
  return {
    setQuery,
    setStatus,
    view,
    data,
    manage,
    openForm,
    mutate,
    newCompany,
    query,
    status,
    page,
    setPage,
    proposal,
    setProposal,
    search,
    paginate,
    filters,
    empty,
    confirm,
  };
}
