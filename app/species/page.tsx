"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { useRouter } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SpeciesCard from "./species-card";
import SpeciesFilter from "./filter";

interface Species {
  id: number;
  scientific_name: string;
  common_name: string | null;
  kingdom: "Animalia" | "Plantae" | "Fungi" | "Protista" | "Archaea" | "Bacteria";
  total_population: number | null;
  image: string | null;
  description: string | null;
  author: string;
}

export default function SpeciesList() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [species, setSpecies] = useState<Species[]>([]);
  const [filteredSpecies, setFilteredSpecies] = useState<Species[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Function to fetch species from the database.
  async function fetchSpecies() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.push("/");
      return;
    }
    setUserId(sessionData.session.user.id);

    const { data: speciesData, error } = await supabase
      .from("species")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error fetching species:", error.message);
      return;
    }

    setSpecies(speciesData || []);
    setFilteredSpecies(speciesData || []);
  }

  useEffect(() => {
    // Initial fetch when the component mounts.
    fetchSpecies();

    // Subscribe to realtime INSERT events using a separate client instance.
    const realtimeClient = createBrowserSupabaseClient();

    const channel = realtimeClient
      .channel("public:species")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "species" },
        (payload) => {
          console.log("New species inserted (via realtime):", payload);
          fetchSpecies();
        }
      )
      .subscribe();

    return () => {
      realtimeClient.removeChannel(channel);
    };
  }, [router]);

  // Wait until userId is set before rendering.
  if (!userId) return <div>Loading...</div>;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species List</TypographyH2>
        {/* Pass fetchSpecies as the callback so that the list refreshes upon adding */}
        <AddSpeciesDialog userId={userId} onSpeciesAdded={fetchSpecies} />
      </div>

      {/* Filtering System */}
      <SpeciesFilter species={species} setFilteredSpecies={setFilteredSpecies} />

      <Separator className="my-4" />

      <div className="flex flex-wrap justify-center">
        {filteredSpecies.map((sp) => (
          <SpeciesCard key={sp.id} species={sp} userId={userId} />
        ))}
      </div>
    </>
  );
}




