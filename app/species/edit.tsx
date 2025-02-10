"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Database } from "@/lib/schema";

// Define the kingdom options
const kingdoms = z.enum(["Animalia", "Plantae", "Fungi", "Protista", "Archaea", "Bacteria"]);

// Define the Zod schema for species editing
const speciesSchema = z.object({
  scientific_name: z.string().trim().min(1, "Scientific Name is required"),
  common_name: z.string().nullable().transform((val) => (val?.trim() ? val.trim() : "")),
  kingdom: kingdoms,
  total_population: z
    .union([z.string(), z.number()])
    .nullable()
    .transform((val) => (val ? Number(val) : "")) // Ensures the field is empty string instead of null
    .refine((val) => val === "" || (typeof val === "number" && val > 0), {
      message: "Total Population must be a positive number",
    }),
  image: z.string().url().nullable().transform((val) => (val?.trim() ? val.trim() : "")), // Fix for null
  description: z.string().nullable().transform((val) => (val?.trim() ? val.trim() : "")), // Fix for null
});

// Define the form data type
type FormData = z.infer<typeof speciesSchema>;

// Define the species type from the database
type Species = Database["public"]["Tables"]["species"]["Row"];

export default function EditSpeciesDialog({ userId, species }: { userId: string; species: Species }) {
  // Ensure that all hooks are called unconditionally at the top
  const [open, setOpen] = useState<boolean>(false);

  const form = useForm<FormData>({
    resolver: zodResolver(speciesSchema),
    defaultValues: {
      scientific_name: species.scientific_name ?? "",
      common_name: species.common_name ?? "",
      kingdom: species.kingdom ?? "Animalia",
      total_population: species.total_population ?? "",
      image: species.image ?? "",
      description: species.description ?? "",
    },
    mode: "onChange",
  });

  // Only allow editing if the logged-in user is the author of the species entry.
  if (userId !== species.author) {
    return null;
  }

  // Initialize the form with default values from the species data


  const onSubmit = async (input: FormData) => {
    const supabase = createBrowserSupabaseClient();

    // Convert empty string values to null for fields that should be nullable
    const sanitizedInput = {
      ...input,
      total_population: input.total_population === "" ? null : input.total_population,
    };

    // Update species only if the user is the author
    const { error } = await supabase
      .from("species")
      .update(sanitizedInput)
      .eq("id", species.id)
      .eq("author", userId);

    if (error) {
      toast({
        title: "Error updating species",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Close the dialog
    setOpen(false);

    // Option 1: Refresh the current route using Next.js router (recommended if you're using the App Router)
    window.location.reload();

    // Option 2: Alternatively, perform a full browser reload.
    // window.location.reload();

    toast({
      title: "Species updated!",
      description: `Successfully updated ${input.scientific_name}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Species</DialogTitle>
          <DialogDescription>Modify species details and click Save Changes when done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e: BaseSyntheticEvent) => void form.handleSubmit(onSubmit)(e)}>
            <div className="grid w-full items-center gap-4">
              <FormField
                control={form.control}
                name="scientific_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scientific Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="common_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Common Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kingdom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kingdom</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a kingdom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {kingdoms.options.map((kingdom) => (
                            <SelectItem key={kingdom} value={kingdom}>
                              {kingdom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_population"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Population</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value, 10) : "")
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex">
                <Button type="submit" className="mr-2">
                  Save Changes
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
