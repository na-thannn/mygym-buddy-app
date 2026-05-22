import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Apple, Utensils, Droplet, Flame, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — HL Fitness" }] }),
  component: Nutrition,
});

function Nutrition() {
  const [meals, setMeals] = useState([
     { id: 1, type: "Breakfast", icon: "🍳", desc: "Oatmeal with whey protein and berries", cals: 450 },
     { id: 2, type: "Lunch", icon: "🥗", desc: "Grilled chicken breast with quinoa and broccoli", cals: 650 },
  ]);
  const [open, setOpen] = useState(false);

  const handleLogMeal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMeals((prev) => [...prev, {
      id: Date.now(),
      type: fd.get("type") as string,
      icon: "🍽️",
      desc: fd.get("desc") as string,
      cals: Number(fd.get("cals")),
    }]);
    setOpen(false);
  };

  const totalCals = meals.reduce((sum, m) => sum + m.cals, 0);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader title="Nutrition Guide" description="Your daily dietary goals and meals" />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300 gap-2 mb-2 md:mb-0 w-full md:w-auto">
              <Utensils className="size-4" /> Log Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#0a0c08] border-white/10 text-slate-200">
            <form onSubmit={handleLogMeal}>
              <DialogHeader>
                <DialogTitle>Add a Meal</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Quickly log what you ate to keep your macros on track.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right text-slate-300">Type</Label>
                  <Input id="type" name="type" placeholder="e.g. Snack" className="col-span-3 bg-white/5 border-white/10" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="desc" className="text-right text-slate-300">Description</Label>
                  <Input id="desc" name="desc" placeholder="e.g. Protein Shake" className="col-span-3 bg-white/5 border-white/10" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cals" className="text-right text-slate-300">Calories</Label>
                  <Input id="cals" name="cals" type="number" className="col-span-3 bg-white/5 border-white/10" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">Save Meal</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 animate-fade-up">
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 flex flex-col items-center justify-center text-center">
          <div className="text-yellow-400 mb-2"><Flame className="size-6" /></div>
          <div className="text-2xl font-bold text-slate-100">{totalCals} <span className="text-sm font-normal text-slate-400">/ 2450</span></div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Calories</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 flex flex-col items-center justify-center text-center">
           <div className="text-blue-400 mb-2"><Utensils className="size-6" /></div>
          <div className="text-2xl font-bold text-slate-100">180g</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Protein</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 flex flex-col items-center justify-center text-center">
           <div className="text-orange-400 mb-2"><Apple className="size-6" /></div>
          <div className="text-2xl font-bold text-slate-100">240g</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Carbs</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 flex flex-col items-center justify-center text-center">
           <div className="text-yellow-400 mb-2"><Droplet className="size-6" /></div>
          <div className="text-2xl font-bold text-slate-100">65g</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Fats</div>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-100 mt-10 mb-6">Today's Meal Plan</h3>
      
      <div className="space-y-4 animate-fade-up stagger-1">
        {meals.map((meal) => (
          <div key={meal.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-xl">
                {meal.icon}
              </div>
              <div>
                <div className="font-semibold text-slate-200">{meal.type}</div>
                <div className="text-sm text-slate-400">{meal.desc}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-yellow-400">{meal.cals} kcal</div>
              {meal.macros && <div className="text-xs text-slate-500">{meal.macros}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:text-yellow-300 hover:border-yellow-500/30">
          Generate New Meal Plan with AI Coach <ArrowRight className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}