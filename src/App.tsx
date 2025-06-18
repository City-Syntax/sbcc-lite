import {
  embodiedCarbonCalculator,
  globalComponents,
  countryComponents,
  ports,
  vehicles,
  referenceValues,
  type CalculatorParameters,
} from "@citysyntax/sbcc-core";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Input } from "./components/ui/input";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/ui/form";
import { Copy, Delete, Download, Plus } from "lucide-react";
import { cn } from "./lib/utils";

const useEmbodiedCarbonCalculator = () =>
  useMemo(() => embodiedCarbonCalculator(), []);

const defaultInputRow = (): InputRow => ({
  componentId: globalComponents[0].componentId,
  countryId: "Singapore",
  quantity: 20,
  units: "tonne",
  marineVehicleId: "Bulk carrier",
  internationalRoadVehicleId: "Very heavy goods vehicle",
  internationalRoadDistance: 0,
  localRoadVehicleId: "Heavy goods vehicle",
  localRoadDistance: 50,
});

const rowschema = z.object({
  componentId: z.string(),
  greenMarkCategory: z.enum(["Concrete", "Steel", "Glass"]).optional(),
  countryId: z.string(),
  quantity: z.coerce.number().min(0),
  units: z.enum(["tonne", "kg"]),
  manualMarineDistance: z.coerce.number().optional(),
  marineVehicleId: z.string(),
  internationalRoadVehicleId: z.string(),
  internationalRoadDistance: z.coerce.number().min(0),
  localRoadVehicleId: z.string(),
  localRoadDistance: z.coerce.number().min(0),
});

const unique = (arr: string[]) => Array.from(new Set(arr));

const componentIds = unique([
  ...globalComponents.map((c) => c.componentId),
  ...countryComponents.map((c) => c.componentId),
]);

const countryIds = unique([
  ...countryComponents.map((c) => c.countryId),
  ...ports.map((p) => p.countryId),
]);

const marineVehicleIds = unique(
  vehicles.filter((v) => v.mode.includes("Maritime")).map((v) => v.vehicleId)
);

const roadVehicles = unique(
  vehicles.filter((v) => v.mode.includes("Road")).map((v) => v.vehicleId)
);

const componentIdToGreenmarkMap = [
  ...globalComponents,
  ...countryComponents,
].reduce((acc, component) => {
  acc[component.componentId] = component.greenMarkCategory as
    | "Concrete"
    | "Steel"
    | "Glass"
    | undefined;
  return acc;
}, {} as Record<string, "Concrete" | "Steel" | "Glass" | undefined>);

const referenceValueOptions = referenceValues.map(
  ({ buildingType, referenceValue }) => ({
    value: referenceValue.toString(),
    label: `${buildingType} (${referenceValue}kgCO₂eq/m² GFA)`,
  })
);
type InputRow = z.infer<typeof rowschema>;

function App() {
  const form = useForm({
    defaultValues: {
      rows: [defaultInputRow()],
      gfa: 1000,
      referenceValue: referenceValues[0].referenceValue,
    },
    resolver: zodResolver(
      z.object({
        rows: z.array(rowschema),
        gfa: z.coerce.number(),
        referenceValue: z.coerce.number(),
      })
    ),
  });

  const calculatorParameters = form.watch();
  const rows = form.watch("rows");

  const { append, remove } = useFieldArray({
    control: form.control,
    name: "rows",
  });

  const output = useEmbodiedCarbonCalculator().calculateGreenMark(
    calculatorParameters as CalculatorParameters
  );

  return (
    <section className="p-8 flex flex-col gap-4 cursor-auto">
      <p className="text-xs">
        using{" "}
        <span className="font-medium font-mono">
          @citysyntax/sbcc-core@{output.version}
        </span>
      </p>
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-xl font-semibold">Total Embodied Carbon</h2>
          <p className="text-4xl font-light">
            {output.totalEmissions.toFixed(2)} kgCO₂eq
          </p>
        </div>
        <div
          className={cn(
            "border rounded-lg w-fit p-4",
            output.greenMarkScore === 2 && "bg-green-100 border-green-200",
            output.greenMarkScore === 1 && "bg-yellow-100 border-yellow-200",
            output.greenMarkScore === 0 && "bg-red-100 border-red-200"
          )}>
          <p className="text-xs">this project qualifies for </p>
          <p className="text-lg font-semibold flex flex-row">
            {" "}
            {output.greenMarkScore} Green Mark{" "}
            {output.greenMarkScore === 1 ? "Point" : "Points"}
          </p>
          <p className="text-xs mb-2">w.r.t Green Mark CN 2021 1.1</p>
          <div className="flex flex-row gap-4">
            <p className="text-xs flex flex-col">
              <span className="text-3xl">
                {output.embodiedCarbonPerGfa.toFixed(2)}
              </span>{" "}
              kgCO₂eq/m² GFA
            </p>

            <p className="text-xs flex flex-col">
              <span className="text-3xl">
                {output.embodiedCarbonPerGfaComparedToReference.toFixed(0)}%
              </span>
              reduction compared to reference value
            </p>
          </div>
        </div>
      </div>
      <div>
        <Button
          onClick={() => {
            //download the output as JSON
            const blob = new Blob([JSON.stringify(output, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "output.sbcc.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}>
          <Download /> output.sbcc.json
        </Button>
      </div>

      <Form {...form}>
        <div className="w-fit flex flex-row gap-4">
          <FormField
            key={`gfa`}
            control={form.control}
            name={`gfa`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>GFA</FormLabel>
                <Input type="number" {...field} />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            key={`referenceValue`}
            control={form.control}
            name={`referenceValue`}
            render={({ field: { value, onChange } }) => (
              <FormItem>
                <FormLabel>Reference Value</FormLabel>
                <SelectInput
                  value={value.toString()}
                  onValueChange={onChange}
                  options={referenceValueOptions}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="overflow-y-auto p-4 rounded-md">
          <div className="grid grid-cols-14 gap-1 w-[2200px] pb-4">
            <TableHeader>Component</TableHeader>
            <TableHeader>Greenmark Category</TableHeader>
            <TableHeader>Country of Origin</TableHeader>
            <TableHeader>Quantity</TableHeader>
            <TableHeader>Units</TableHeader>
            <TableHeader>Marine Vehicle</TableHeader>
            <TableHeader>Manual Marine Distance (km)</TableHeader>
            <TableHeader>International Road Vehicle</TableHeader>
            <TableHeader>International Road Distance (km)</TableHeader>
            <TableHeader>Local Road Vehicle</TableHeader>
            <TableHeader>Local Road Distance(m)</TableHeader>
            <TableHeader>A1-A3 (kg CO₂eq)</TableHeader>
            <TableHeader>A4 (kg CO₂eq)</TableHeader>
            <TableHeader>Actions</TableHeader>
            {rows.map((_, index) => (
              <>
                <FormField
                  key={`component-${index}`}
                  control={form.control}
                  name={`rows.${index}.componentId`}
                  render={({ field: { value, onChange } }) => (
                    <SelectInput
                      value={value}
                      onValueChange={(v) => {
                        onChange(v);
                        // Update the greenMarkCategory based on the componentId
                        const greenMarkCategory = componentIdToGreenmarkMap[v];

                        console.log(
                          `Setting greenMarkCategory for ${v} to ${greenMarkCategory}`
                        );
                        form.setValue(
                          `rows.${index}.greenMarkCategory`,
                          greenMarkCategory
                        );
                      }}
                      options={componentIds}
                    />
                  )}
                />
                <FormField
                  key={`gm-category-${index}`}
                  control={form.control}
                  name={`rows.${index}.greenMarkCategory`}
                  render={({ field: { value, onChange } }) => (
                    <SelectInput
                      value={value}
                      onValueChange={onChange}
                      options={["Concrete", "Steel", "Glass"]}
                      placeholder="No Category"
                    />
                  )}
                />
                <FormField
                  key={`country-${index}`}
                  control={form.control}
                  name={`rows.${index}.countryId`}
                  render={({ field: { value, onChange } }) => (
                    <SelectInput
                      value={value}
                      onValueChange={onChange}
                      options={countryIds}
                    />
                  )}
                />
                <FormField
                  key={`quantity-${index}`}
                  control={form.control}
                  name={`rows.${index}.quantity`}
                  render={({ field }) => <Input type="number" {...field} />}
                />

                <FormField
                  key={`units-${index}`}
                  control={form.control}
                  name={`rows.${index}.units`}
                  render={({ field: { value, onChange } }) => (
                    <SelectInput
                      value={value}
                      onValueChange={onChange}
                      options={["tonne", "kg"]}
                    />
                  )}
                />

                <FormField
                  key={`marineVehicleId-${index}`}
                  control={form.control}
                  name={`rows.${index}.marineVehicleId`}
                  render={({ field: { value, onChange } }) => (
                    <SelectInput
                      value={value}
                      onValueChange={onChange}
                      options={marineVehicleIds}
                    />
                  )}
                />

                <FormField
                  key={`marineVehicleDistance-${index}`}
                  control={form.control}
                  name={`rows.${index}.manualMarineDistance`}
                  render={({ field }) => (
                    <Input type="number" placeholder="optional" {...field} />
                  )}
                />

                <FormField
                  key={`internationalRoadVehicle-${index}`}
                  control={form.control}
                  name={`rows.${index}.internationalRoadVehicleId`}
                  render={({ field: { value, onChange } }) => (
                    <SelectInput
                      value={value}
                      onValueChange={onChange}
                      options={roadVehicles}
                    />
                  )}
                />

                <FormField
                  key={`internationalRoadDistance-${index}`}
                  control={form.control}
                  name={`rows.${index}.internationalRoadDistance`}
                  render={({ field }) => <Input type="number" {...field} />}
                />

                <FormField
                  key={`localRoadVehicle-${index}`}
                  control={form.control}
                  name={`rows.${index}.localRoadVehicleId`}
                  render={({ field: { value, onChange } }) => (
                    <SelectInput
                      value={value}
                      onValueChange={onChange}
                      options={roadVehicles}
                    />
                  )}
                />
                <FormField
                  key={`localRoadDistance-${index}`}
                  control={form.control}
                  name={`rows.${index}.localRoadDistance`}
                  render={({ field }) => <Input type="number" {...field} />}
                />

                <Input disabled value={output.rows[index].a1a3} />
                <Input disabled value={output.rows[index].a4} />

                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    key={`copy-${index}`}
                    onClick={() => append({ ...rows[index] })}>
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    key={`delete-${index}`}
                    onClick={() => remove(index)}>
                    <Delete />
                  </Button>
                </div>
              </>
            ))}
            <Button type="button" onClick={() => append(defaultInputRow())}>
              <Plus />
              Add Row
            </Button>
            <Button
              type="button"
              className="col-start-13"
              onClick={() => append(defaultInputRow())}>
              <Plus />
              Add Row
            </Button>
          </div>
        </div>
      </Form>
    </section>
  );
}

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center">
    {children}
  </p>
);

function SelectInput({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
}: {
  value?: string;
  onValueChange: (value: string) => void;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  console.log("SelectInput rendered", { value, options, placeholder });
  return (
    <Select
      value={value ?? ""}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={setOpen}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* This is an optimization to prevent rendering too many things in the dom */}
        {open &&
          options.map((option) => {
            if (typeof option === "string") {
              return (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              );
            }
            return (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            );
          })}

        {!open && value && (
          <SelectItem value={value} disabled>
            {typeof options[0] === "string"
              ? value
              : (options as { value: string; label: string }[]).find(
                  (o) => o.value === value
                )?.label}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export default App;
