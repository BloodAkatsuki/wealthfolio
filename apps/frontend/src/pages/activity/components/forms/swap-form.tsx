import { useAmountFormatting, Spinner } from "@wealthfolio/ui";
import { Alert, AlertDescription } from "@wealthfolio/ui/components/ui/alert";
import { Button } from "@wealthfolio/ui/components/ui/button";
import { Icons } from "@wealthfolio/ui/components/ui/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TFunction } from "i18next";
import { useMemo } from "react";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { invalidTypeError, requiredError } from "@/lib/zod-errors";
import { useActivityCurrency } from "../../hooks/use-activity-currency";
import {
  AccountSelect,
  AmountInput,
  createValidatedSubmit,
  DatePicker,
  FormSection,
  NotesInput,
  QuantityInput,
  SymbolSearch,
  type AccountSelectOption,
} from "./fields";
import { assetMetadataSchema } from "./schemas";

// Translated message helper (see buy-form for rationale).
type MsgFn = TFunction | undefined;
const msg = (t: MsgFn, key: string, en: string) => (t ? t(key) : en);

/** Coins carry more decimals than shares (SOL has 9, many tokens more). */
const COIN_DECIMAL_PLACES = 12;

const positiveNumber = (t: MsgFn, key: string, en: string) =>
  z.coerce
    .number({ error: invalidTypeError(msg(t, key, en)) })
    .positive({ message: msg(t, key, en) });

// Zod schema factory for SwapForm validation. `t` optional so the exported
// static schema keeps English messages (used by tests and type inference).
export const createSwapFormSchema = (t?: TFunction) =>
  z
    .object({
      accountId: z.string().min(1, {
        message: msg(t, "activity:form.err_select_account", "Please select an account."),
      }),
      activityDate: z.date({
        error: requiredError(msg(t, "activity:form.err_select_date", "Please select a date.")),
      }),
      fromSymbol: z.string().min(1, {
        message: msg(t, "activity:form.err_enter_symbol", "Please enter a symbol."),
      }),
      fromExistingAssetId: z.string().nullable().optional(),
      fromExchangeMic: z.string().nullable().optional(),
      fromQuoteMode: z.string().nullable().optional(),
      fromQuoteCcy: z.string().nullable().optional(),
      fromInstrumentType: z.string().nullable().optional(),
      fromAssetMetadata: assetMetadataSchema,
      fromQuantity: positiveNumber(
        t,
        "activity:form.err_swap_quantity",
        "Quantity must be greater than 0.",
      ),
      unitPrice: positiveNumber(t, "activity:form.err_swap_price", "Price must be greater than 0."),
      feeQuantity: z.coerce
        .number({
          error: invalidTypeError(
            msg(t, "activity:form.err_swap_fee", "Network fee cannot be negative."),
          ),
        })
        .min(0, {
          message: msg(t, "activity:form.err_swap_fee", "Network fee cannot be negative."),
        })
        .nullable()
        .optional(),
      toSymbol: z.string().min(1, {
        message: msg(t, "activity:form.err_enter_symbol", "Please enter a symbol."),
      }),
      toExistingAssetId: z.string().nullable().optional(),
      toExchangeMic: z.string().nullable().optional(),
      toQuoteMode: z.string().nullable().optional(),
      toQuoteCcy: z.string().nullable().optional(),
      toInstrumentType: z.string().nullable().optional(),
      toAssetMetadata: assetMetadataSchema,
      toQuantity: positiveNumber(
        t,
        "activity:form.err_swap_quantity",
        "Quantity must be greater than 0.",
      ),
      currency: z
        .string({ error: msg(t, "activity:form.err_currency_required", "Currency is required.") })
        .min(1, {
          message: msg(t, "activity:form.err_currency_required", "Currency is required."),
        }),
      comment: z.string().optional().nullable(),
    })
    .refine((data) => (data.feeQuantity ?? 0) < data.fromQuantity, {
      message: msg(
        t,
        "activity:form.err_swap_fee_too_large",
        "Network fee must be less than the quantity given.",
      ),
      path: ["feeQuantity"],
    })
    .refine(
      (data) =>
        data.fromSymbol.trim().toUpperCase() !== data.toSymbol.trim().toUpperCase() ||
        (data.fromExchangeMic ?? "") !== (data.toExchangeMic ?? ""),
      {
        message: msg(t, "activity:form.err_swap_same_asset", "Choose two different assets."),
        path: ["toSymbol"],
      },
    );

// Zod schema for SwapForm validation (English messages; used by tests).
export const swapFormSchema = createSwapFormSchema();

export type SwapFormValues = z.infer<typeof swapFormSchema>;

interface SwapFormProps {
  accounts: AccountSelectOption[];
  defaultValues?: Partial<SwapFormValues>;
  onSubmit: (data: SwapFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

/** The given units' value net of the network fee, and what one received unit cost. */
export function swapValues(values: {
  fromQuantity?: number | null;
  feeQuantity?: number | null;
  unitPrice?: number | null;
  toQuantity?: number | null;
}): { value?: number; receivedUnitPrice?: number } {
  const fromQuantity = Number(values.fromQuantity);
  const unitPrice = Number(values.unitPrice);
  const feeQuantity = Number(values.feeQuantity ?? 0);
  if (!(fromQuantity > 0) || !(unitPrice > 0) || !(feeQuantity >= 0)) return {};
  if (feeQuantity >= fromQuantity) return {};
  const value = (fromQuantity - feeQuantity) * unitPrice;
  const toQuantity = Number(values.toQuantity);
  return { value, receivedUnitPrice: toQuantity > 0 ? value / toQuantity : undefined };
}

export function SwapForm({
  accounts,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditing = false,
}: SwapFormProps) {
  const { t } = useTranslation(["activity"]);
  const { formatAmount } = useAmountFormatting();
  const schema = useMemo(() => createSwapFormSchema(t), [t]);

  const initialAccountId =
    defaultValues?.accountId ?? (accounts.length === 1 ? accounts[0].value : "");
  const initialAccount = accounts.find((a) => a.value === initialAccountId);

  const form = useForm<SwapFormValues>({
    resolver: zodResolver(schema) as Resolver<SwapFormValues>,
    mode: "onSubmit",
    defaultValues: {
      accountId: initialAccountId,
      activityDate: new Date(),
      fromSymbol: "",
      toSymbol: "",
      feeQuantity: null,
      comment: null,
      ...defaultValues,
      currency: defaultValues?.currency?.trim() || initialAccount?.currency,
    },
  });

  useActivityCurrency(form, accounts, { isEditing });

  const { watch } = form;
  const currency = watch("currency");
  const { value, receivedUnitPrice } = swapValues({
    fromQuantity: watch("fromQuantity"),
    feeQuantity: watch("feeQuantity"),
    unitPrice: watch("unitPrice"),
    toQuantity: watch("toQuantity"),
  });
  const toSymbol = watch("toSymbol");

  const handleSubmit = createValidatedSubmit(form, async (data) => {
    await onSubmit(data);
  });

  if (isEditing) {
    return (
      <Alert>
        <Icons.Info className="h-4 w-4" />
        <AlertDescription>{t("activity:form.swap_edit_notice")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection title={t("activity:form.section_swap_account")}>
          <AccountSelect name="accountId" accounts={accounts} />
          <DatePicker name="activityDate" label={t("activity:field_date")} enableTime={true} />
        </FormSection>

        <FormSection title={t("activity:form.section_swap_give")}>
          <SymbolSearch
            name="fromSymbol"
            exchangeMicName="fromExchangeMic"
            quoteModeName="fromQuoteMode"
            currencyName="currency"
            quoteCcyName="fromQuoteCcy"
            instrumentTypeName="fromInstrumentType"
            existingAssetIdName="fromExistingAssetId"
            assetMetadataName="fromAssetMetadata"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <QuantityInput
              name="fromQuantity"
              label={t("activity:form.label_swap_quantity_given")}
              maxDecimalPlaces={COIN_DECIMAL_PLACES}
            />
            <AmountInput
              name="unitPrice"
              label={t("activity:form.label_swap_price")}
              maxDecimalPlaces={8}
              currency={currency}
            />
          </div>
          <QuantityInput
            name="feeQuantity"
            label={t("activity:form.label_swap_fee")}
            maxDecimalPlaces={COIN_DECIMAL_PLACES}
          />
        </FormSection>

        <FormSection title={t("activity:form.section_swap_receive")}>
          <SymbolSearch
            name="toSymbol"
            exchangeMicName="toExchangeMic"
            quoteModeName="toQuoteMode"
            quoteCcyName="toQuoteCcy"
            instrumentTypeName="toInstrumentType"
            existingAssetIdName="toExistingAssetId"
            assetMetadataName="toAssetMetadata"
            defaultCurrency={currency}
          />
          <QuantityInput
            name="toQuantity"
            label={t("activity:form.label_swap_quantity_received")}
            maxDecimalPlaces={COIN_DECIMAL_PLACES}
          />
          {value !== undefined && currency && (
            <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt>{t("activity:form.label_swap_value")}</dt>
              <dd className="text-foreground text-end tabular-nums">
                {formatAmount(value, currency)}
              </dd>
              {receivedUnitPrice !== undefined && (
                <>
                  <dt>
                    {t("activity:form.label_swap_cost_per_unit", {
                      symbol: toSymbol?.trim() || "—",
                    })}
                  </dt>
                  <dd className="text-foreground text-end tabular-nums">
                    {formatAmount(receivedUnitPrice, currency)}
                  </dd>
                </>
              )}
            </dl>
          )}
          <p className="text-muted-foreground text-xs">{t("activity:form.swap_realize_hint")}</p>
        </FormSection>

        <FormSection title={t("activity:form.label_notes")}>
          <NotesInput name="comment" placeholder={t("activity:form.placeholder_note")} />
        </FormSection>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              {t("activity:cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Spinner className="me-2 h-4 w-4" />
            ) : (
              <Icons.Plus className="me-2 h-4 w-4" />
            )}
            {t("activity:form.button_add_swap")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
