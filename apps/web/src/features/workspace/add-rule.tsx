"use client";

import { CMP_OPS, type CmpOp, type FormDefinition, type Rule } from "@niarva/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const OP_TEXT: Record<CmpOp, string> = { eq: "= (eq)", neq: "≠ (neq)", gt: "> (gt)", gte: "≥ (gte)", lt: "< (lt)", lte: "≤ (lte)" };
const selectClass = "mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-canvas px-2 text-sm";

function newRuleId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `rule_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Adds a conditional rule to the unsaved draft: show or require a field when a number field compares
 * to a value. Nothing is trusted here: after the draft is saved as a new version, the engine checks
 * the rule's structure and traces it against the approved claims, so a rule no claim asks for is
 * flagged rather than accepted silently.
 */
export function AddRule({ fields, disabled, onAdd }: { fields: FormDefinition["fields"]; disabled: boolean; onAdd: (rule: Rule) => void }) {
  const numeric = fields.filter((field) => field.type === "number");
  const [open, setOpen] = useState(false);
  const [effect, setEffect] = useState<Rule["effect"]>("require");
  const [conditionField, setConditionField] = useState(numeric[0]?.key ?? "");
  const [target, setTarget] = useState(() => fields.find((field) => field.key !== numeric[0]?.key)?.key ?? "");
  const [op, setOp] = useState<CmpOp>("gte");
  const [value, setValue] = useState("");

  if (numeric.length === 0) return <p className="text-xs text-ink-muted">New rules compare a number field, and this form has none.</p>;
  if (!open) {
    return (
      <Button size="sm" variant="secondary" className="self-start" disabled={disabled} onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="size-4" />
        Add a rule
      </Button>
    );
  }

  const targets = fields.filter((field) => field.key !== conditionField);
  const trimmed = value.trim();
  const ready = trimmed !== "" && /^-?\d+(\.\d+)?$/.test(trimmed) && targets.some((field) => field.key === target);

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-3" data-testid="add-rule">
      <legend className="px-1 text-sm font-semibold">New rule</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="new-rule-effect" className="text-xs text-ink-muted">Then</Label>
          <select id="new-rule-effect" className={selectClass} value={effect} onChange={(event) => setEffect(event.target.value as Rule["effect"])}>
            <option value="require">Require</option>
            <option value="show">Show</option>
          </select>
        </div>
        <div>
          <Label htmlFor="new-rule-target" className="text-xs text-ink-muted">Field</Label>
          <select id="new-rule-target" className={selectClass} value={target} onChange={(event) => setTarget(event.target.value)}>
            {targets.map((field) => <option key={field.key} value={field.key}>{field.label} ({field.key})</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="new-rule-when" className="text-xs text-ink-muted">When</Label>
          <select
            id="new-rule-when"
            className={selectClass}
            value={conditionField}
            onChange={(event) => {
              setConditionField(event.target.value);
              if (event.target.value === target) setTarget(fields.find((field) => field.key !== event.target.value)?.key ?? "");
            }}
          >
            {numeric.map((field) => <option key={field.key} value={field.key}>{field.label} ({field.key})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="new-rule-op" className="text-xs text-ink-muted">Operator</Label>
            <select id="new-rule-op" className={selectClass} value={op} onChange={(event) => setOp(event.target.value as CmpOp)}>
              {CMP_OPS.map((candidate) => <option key={candidate} value={candidate}>{OP_TEXT[candidate]}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="new-rule-value" className="text-xs text-ink-muted">Value</Label>
            <Input id="new-rule-value" className="mt-1 min-h-10" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} aria-describedby="new-rule-hint" />
          </div>
        </div>
      </div>
      <p id="new-rule-hint" className="text-xs text-ink-muted">
        The value is a number, such as 3.5. After you save, NIARVA checks the rule against the approved claims; a rule no claim asks for is flagged.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!ready}
          onClick={() => {
            onAdd({ id: newRuleId(), target, effect, when: { kind: "cmp", field: conditionField, op, value: trimmed }, originClaimKeys: [] });
            setValue("");
            setOpen(false);
          }}
        >
          Add rule
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </fieldset>
  );
}
