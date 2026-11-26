import { Term } from "@/components/term";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEur, formatPercent } from "@/lib/format";
import type { FinancialPlan as Plan } from "@/lib/sim/affordability";
import { type RegistrationRule, TARIFFS_CHECKED_ON } from "@/lib/sim/tariffs";

/** Expenses vs. financing, like a Belgian broker's "financieel plan". */
export function FinancialPlanCard({
  plan,
  rule,
}: {
  plan: Plan;
  rule: RegistrationRule;
}) {
  const notaryPurchase =
    plan.purchase.notaryFee +
    plan.purchase.adminFee +
    plan.purchase.vat +
    plan.purchase.expenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financieel plan</CardTitle>
        <CardDescription>
          Bij een aankoopprijs van {formatEur(plan.price)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="grid h-fit gap-4">
            <h3 className="text-sm font-semibold">Geplande uitgaven</h3>
            <Section title="Aankoop">
              <Row label="Aankoopprijs" value={plan.price} />
              <Row
                label={
                  <>
                    <Term id="registratierechten" cap /> (
                    {formatPercent(rule.rate)}
                    {rule.provisional ? ", aangekondigd" : ""})
                  </>
                }
                value={plan.purchase.registrationDuty}
              />
              <Row
                label={
                  <>
                    Notariskosten <Term id="notarieleAkte">aankoopakte</Term>
                  </>
                }
                value={notaryPurchase}
              />
              <Detail
                label={<Term id="ereloon" cap />}
                value={plan.purchase.notaryFee}
              />
              <Detail
                label={<Term id="administratieveKosten" cap />}
                value={plan.purchase.adminFee}
              />
              <Detail label="Btw (21 %)" value={plan.purchase.vat} />
              <Detail
                label="Uitgaven (geschat)"
                value={plan.purchase.expenses}
              />
            </Section>
            <Section title="Krediet">
              <Row
                label={<Term id="kredietakte" cap />}
                value={plan.credit.total}
              />
              <Detail
                label={
                  <>
                    Registratie- en hypotheekrecht (
                    <Term id="hypothecaireInschrijving">inschrijving</Term>)
                  </>
                }
                value={plan.credit.mortgageDuties}
              />
              <Detail
                label={<Term id="ereloon" cap />}
                value={plan.credit.notaryFee}
              />
              <Detail
                label={<Term id="administratieveKosten" cap />}
                value={plan.credit.adminFee}
              />
              <Detail label="Btw (21 %)" value={plan.credit.vat} />
              <Detail label="Uitgaven (geschat)" value={plan.credit.expenses} />
              <Row
                label={<Term id="dossierkosten" cap />}
                value={plan.fileCosts}
              />
              <Row
                label={<Term id="schattingskosten" cap />}
                value={plan.valuationCosts}
              />
            </Section>
            <Total label="Totaal uitgaven" value={plan.totalExpenses} />
          </div>

          <div className="grid h-fit gap-4">
            <h3 className="text-sm font-semibold">Financiering</h3>
            <Section title="Middelen">
              <Row label="Lening" value={plan.loan} />
              <Row
                label={<Term id="eigenMiddelen" cap />}
                value={plan.ownFunds}
              />
            </Section>
            <Total
              label="Totaal financiering"
              value={plan.loan + plan.ownFunds}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Notariskosten volgens het wettelijk barema (schalen Jbis en Gbis,
          geïndexeerd op 1 januari 2026). Uitgaven zoals opzoekingen en
          retributies zijn geschat en verschillen per dossier.
          {rule.provisional &&
            " Het Vlaamse tarief van 3 % vanaf 2027 is aangekondigd maar nog niet definitief goedgekeurd."}{" "}
          Tarieven gecontroleerd op{" "}
          {new Date(TARIFFS_CHECKED_ON).toLocaleDateString("nl-BE")}.
        </p>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
      <div className="bg-secondary px-3 py-1.5 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
        {title}
      </div>
      <dl className="grid gap-1 p-3 text-sm tabular-nums">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: number }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <dt>{label}</dt>
      <dd className="font-medium">{formatEur(value)}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: React.ReactNode; value: number }) {
  return (
    <div className="flex justify-between gap-4 pl-3 text-xs text-muted-foreground">
      <dt>{label}</dt>
      <dd>{formatEur(value)}</dd>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary tabular-nums">
      <span>{label}</span>
      <span>{formatEur(value)}</span>
    </div>
  );
}
