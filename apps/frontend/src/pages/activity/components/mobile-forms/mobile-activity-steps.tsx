import { Alert, AlertDescription } from "@wealthfolio/ui/components/ui/alert";
import { Icons } from "@wealthfolio/ui/components/ui/icons";
import type { RefObject } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ACTIVITY_SUBTYPES } from "@/lib/constants";
import type { AccountSelectOption } from "../forms/fields";
import type { NewActivityFormValues } from "../forms/schemas";
import { MobileActivityTypeStep } from "./mobile-activity-type-step";
import { MobileDetailsStep } from "./mobile-details-step";

interface MobileActivityStepsProps {
  currentStep: number;
  accounts: AccountSelectOption[];
  isEditing: boolean;
  /**
   * Editing a row whose stored type has no editor here (sync writes needs-review
   * rows as UNKNOWN). Such a row has to be reclassified first, so it walks the
   * type step before the details step instead of going straight to details.
   */
  needsTypeSelection?: boolean;
  amountWasEdited: RefObject<boolean>;
}

export function MobileActivitySteps({
  currentStep,
  accounts,
  isEditing,
  needsTypeSelection = false,
  amountWasEdited,
}: MobileActivityStepsProps) {
  const { t } = useTranslation();
  const { watch } = useFormContext<NewActivityFormValues>();
  const activityType = watch("activityType");
  const subtype = watch("subtype");

  // A swap leg is edited as a whole swap: changing one side alone would move cash.
  if (isEditing && subtype?.toUpperCase() === ACTIVITY_SUBTYPES.SWAP) {
    return (
      <Alert>
        <Icons.Info className="h-4 w-4" />
        <AlertDescription>{t("activity:form.swap_edit_notice")}</AlertDescription>
      </Alert>
    );
  }

  if (isEditing && !needsTypeSelection) {
    return (
      <MobileDetailsStep
        activityType={activityType}
        accounts={accounts}
        isEditing
        amountWasEdited={amountWasEdited}
      />
    );
  }

  return (
    <div className="h-full">
      {currentStep === 1 && (
        <MobileActivityTypeStep
          includeReclassificationTypes={needsTypeSelection}
          accounts={accounts}
        />
      )}
      {currentStep === 2 && activityType && (
        <MobileDetailsStep
          activityType={activityType}
          accounts={accounts}
          isEditing={isEditing}
          amountWasEdited={amountWasEdited}
        />
      )}
    </div>
  );
}
