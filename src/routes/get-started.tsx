import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Activity, Dumbbell, ArrowRight, ArrowLeft, CheckCircle2, User, Trophy, Weight, Home } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/get-started")({
  head: () => ({ meta: [{ title: "Get Started — HL Fitness" }] }),
  component: GetStarted,
});

function GetStarted() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    goal: "",
    experience: "",
    name: "",
    email: "",
    phone: "",
    ptSession: "",
  });

  const goals = [
    { title: "Lose Weight & Fat", icon: Weight, desc: "Shed extra pounds and lean out." },
    { title: "Build Muscle", icon: Dumbbell, desc: "Gain mass and raw strength." },
    { title: "Overall Fitness", icon: Activity, desc: "Improve endurance and health." },
    { title: "Prepare for Event", icon: Trophy, desc: "Train for a specific sport or event." },
  ];

  const levels = ["Beginner", "Intermediate", "Advanced"];

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNext();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1b1f14,_#0f120c_55%,_#090b07_100%)] text-slate-100 flex flex-col pt-12 md:pt-24 items-center px-4 relative">
      <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20">
        <Button asChild variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
          <Link to="/">
            <Home className="size-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="w-full max-w-2xl bg-black/40 backdrop-blur border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl animate-slide-up relative z-10 overflow-hidden">
        {step < 5 && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
            <div className="h-full bg-yellow-400 transition-all duration-500 ease-in-out" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
        )}
        
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2 text-slate-100">What is your primary goal?</h1>
              <p className="text-slate-400">We'll use this to build your perfect course layout.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.title}
                    type="button"
                    onClick={() => { setData({ ...data, goal: g.title }); handleNext(); }}
                    className={`p-5 rounded-xl border text-left flex flex-col gap-3 transition-all ${
                      data.goal === g.title ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`size-6 ${data.goal === g.title ? "text-yellow-400" : "text-slate-300"}`} />
                    <div>
                      <div className="font-semibold text-slate-100">{g.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{g.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <Button type="button" variant="ghost" size="sm" onClick={handlePrev} className="absolute top-4 left-4 text-slate-400"><ArrowLeft className="size-4 mr-1" /> Back</Button>
            <div className="text-center mb-8 pt-4">
              <h1 className="text-3xl font-bold mb-2 text-slate-100">Experience Level</h1>
              <p className="text-slate-400">How long have you been working out consistently?</p>
            </div>
            <div className="space-y-3">
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => { setData({ ...data, experience: lvl }); handleNext(); }}
                  className={`w-full p-4 rounded-xl border text-center font-medium transition-all ${
                    data.experience === lvl ? "border-yellow-400 bg-yellow-400/10 text-yellow-400" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <Button type="button" variant="ghost" size="sm" onClick={handlePrev} className="absolute top-4 left-4 text-slate-400"><ArrowLeft className="size-4 mr-1" /> Back</Button>
            <div className="text-center mb-8 pt-4">
              <h1 className="text-3xl font-bold mb-2 text-slate-100">Your Details</h1>
              <p className="text-slate-400">Let us know how we can reach you to schedule your intro session.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300 ml-1">Full Name</label>
                <Input required value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className="bg-black/50 border-white/10" placeholder="John Doe" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                <Input required type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} className="bg-black/50 border-white/10" placeholder="john@example.com" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300 ml-1">Phone Number</label>
                <Input required type="tel" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} className="bg-black/50 border-white/10" placeholder="+84 ..." />
              </div>
              <Button type="submit" className="w-full bg-yellow-400 text-yellow-950 hover:bg-yellow-300 h-12 text-md mt-4">
                See Your Plan <ArrowRight className="ml-2 size-4" />
              </Button>
            </form>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center mb-6 pt-4">
              <div className="inline-flex size-14 rounded-full bg-yellow-400/20 text-yellow-400 items-center justify-center mb-4">
                <CheckCircle2 className="size-7" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-slate-100">Your Perfect Match</h1>
              <p className="text-slate-400">Based on your answers, we've designed a hybrid starting protocol.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <img src="https://images.unsplash.com/photo-1594381898411-846e7d193883?w=100&q=80" alt="Coach" className="size-16 rounded-full object-cover border-2 border-yellow-400/50" />
                <div>
                  <div className="font-bold text-lg text-slate-100">Coach Liam</div>
                  <div className="text-sm text-yellow-400">Specialist in {data.goal || "Fitness"}</div>
                </div>
              </div>
              <p className="text-sm text-slate-300 italic px-2 border-l-2 border-yellow-400/50">
                Hi {data.name.split(' ')[0] || 'there'}! With your {data.experience ? data.experience.toLowerCase() : 'current'} experience level, I recommend starting with our 3-day foundation plan. Let's get you in for a 1-on-1 testing session.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="font-semibold text-slate-200">Book your first Free PT Session:</h3>
              <div className="grid grid-cols-2 gap-3">
                 {["Tomorrow Morning", "Tomorrow Evening", "This Weekend"].map(slot => (
                   <button 
                    key={slot}
                    type="button"
                    onClick={() => setData({ ...data, ptSession: slot })}
                    className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${
                       data.ptSession === slot ? "border-yellow-400 bg-yellow-400/10 text-yellow-400" : "border-white/10 bg-black/40 text-slate-300 hover:bg-white/10"
                    }`}
                   >{slot}</button>
                 ))}
              </div>
            </div>

            <Button 
              type="button"
              onClick={handleNext} 
              disabled={!data.ptSession}
              className="w-full bg-yellow-400 text-yellow-950 hover:bg-yellow-300 h-12 text-md mt-4 disabled:opacity-50"
            >
              Confirm Booking & Create Account <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        )}

        {step === 5 && (
          <div className="animate-fade-in text-center py-12 space-y-6">
            <div className="inline-flex size-20 rounded-full bg-yellow-400 text-yellow-950 items-center justify-center mb-4 animate-glow">
              <CheckCircle2 className="size-10" />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-slate-100">You're All Set!</h1>
            <p className="text-slate-400 max-w-sm mx-auto">
              Your session for <span className="text-yellow-400">{data.ptSession}</span> is booked with Coach Liam. Check your email for details.
            </p>
            <div className="pt-8">
               <Button asChild size="lg" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
                  <Link to="/auth" search={{ mode: "signup", redirect: "/feed", email: data.email }}>
                     Continue to App Registration
                  </Link>
               </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}