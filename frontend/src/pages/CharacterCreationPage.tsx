
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from 'utils/authStore';
import { supabase } from 'utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// Define profession types (can be moved to a types file later)
interface Profession {
  id: string;
  name: string;
  description: string;
  effects: string;
}

const professions: Profession[] = [
  {
    id: 'graphic_designer',
    name: 'Graphic Designer',
    description: 'Creates visually appealing designs for clients. Enjoys creative work but faces tight deadlines.',
    effects: 'Starts with slightly higher Tone. Earns money in bursts, potentially higher Stress gain during work.',
  },
  {
    id: 'online_marketer',
    name: 'Online Marketer',
    description: 'Helps businesses grow online via ads and social media. Analytical work requiring constant monitoring.',
    effects: 'Starts with slightly more Money. Stable income, steady Tone decrease during work.',
  },
   {
    id: 'content_writer',
    name: 'Content Writer',
    description: 'Crafts articles, blog posts, and copy. Requires focus and creativity.',
    effects: 'Good stress reduction during work breaks (reading). Income depends on project quality.',
  },
];

export default function CharacterCreationPage() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuthStore((state) => ({
    user: state.user,
    session: state.session,
    loading: state.loading,
  }));
  const [selectedProfessionId, setSelectedProfessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null); // To check if profile exists

   useEffect(() => {
    // Redirect to login if auth is loading or user is not logged in
    if (!authLoading && !session) {
      console.log('User not logged in, redirecting to login.');
      toast.info("Please log in to create your character.");
      navigate('/login');
    }
  }, [session, authLoading, navigate]);

  // Placeholder: Check if user already selected a profession in their profile
  useEffect(() => {
     const checkProfile = async () => {
       if (user) {
         try {
            console.log(`Checking profile for user ID: ${user.id}`);
            const { data, error } = await supabase
              .from('profiles')
              .select('freelance_profession')
              .eq('id', user.id)
              .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = Row not found
                throw error;
            }

            if (data && data.freelance_profession) {
                console.log(`User already has profession: ${data.freelance_profession}. Redirecting...`);
                toast.info("You've already chosen a profession!");
                // Navigate to main game page in the future
                // For now, maybe navigate home or show a message
                navigate('/'); // Redirect home if profession already chosen
            } else {
                 console.log("User profile exists but no profession selected, or profile doesn't exist yet.");
                 setProfileExists(data !== null); // Profile exists if data is not null (even if profession is null)
            }
         } catch(error: any) {
             console.error("Error checking profile:", error);
             toast.error("Could not verify your profile status.");
             // Decide how to handle this - maybe stay on page with error?
         }
       }
     };
     if (!authLoading && user) {
         checkProfile();
     }
  }, [user, authLoading, navigate]);


  const handleSelectProfession = (professionId: string) => {
    setSelectedProfessionId(professionId);
  };

  const handleConfirmProfession = async () => {
    if (!selectedProfessionId || !user) {
        toast.warning("Please select a profession first.");
        return;
    }

    setIsSaving(true);
    try {
        console.log(`Saving profession '${selectedProfessionId}' for user ID: ${user.id}`);
        const { error } = await supabase
            .from('profiles')
            .update({ freelance_profession: selectedProfessionId })
            .eq('id', user.id);

        if (error) throw error;

        toast.success(`Profession '${professions.find(p => p.id === selectedProfessionId)?.name}' selected!`);
        console.log("Profession saved successfully. Navigating...");
        // Navigate to the main game screen in the future
        navigate('/'); // Navigate home for now

    } catch (error: any) {
        console.error("Error saving profession:", error);
        toast.error(`Failed to save profession: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  // Display loading states
  if (authLoading || profileExists === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading character creation...
      </div>
    );
  }

  // Render page content
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <Card className="w-full max-w-4xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-stone-800">
            Choose Your Freelance Path
          </CardTitle>
          <CardDescription className="text-lg text-stone-600 pt-2">
            Select the profession that best suits your style. This will influence your starting conditions and gameplay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {professions.map((profession) => (
              <Card
                key={profession.id}
                className={`cursor-pointer transition-all duration-200 ease-in-out ${
                  selectedProfessionId === profession.id
                    ? 'ring-2 ring-orange-500 shadow-lg scale-105 border-orange-300'
                    : 'hover:shadow-md hover:border-stone-300'
                } border`}
                onClick={() => handleSelectProfession(profession.id)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{profession.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-600 mb-2">{profession.description}</p>
                  <p className="text-xs text-stone-500 italic">Effects: {profession.effects}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleConfirmProfession}
              disabled={!selectedProfessionId || isSaving}
              className="px-8 py-3 text-lg font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md"
            >
              {isSaving ? 'Saving...' : 'Confirm Profession'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
