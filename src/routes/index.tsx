import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Apple,
  ArrowRight,
  BadgeCheck,
  Dumbbell,
  Flame,
  HeartPulse,
  LineChart,
  MapPin,
  MessageCircle,
  Scale,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HL Fitness 303 Le Thanh Nghi — AI powered training platform" },
      { name: "description", content: "HL Fitness Da Nang community — track InBody, workouts, nutrition, AI Coach, and real trainers." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const features = [
    { icon: Scale, title: "InBody Tracking", desc: "Upload results and see progress charts over time." },
    { icon: Dumbbell, title: "Workout Log", desc: "Record sets, reps, and loads with weekly PRs." },
    { icon: Apple, title: "Nutrition Log", desc: "Track meals, calories, and macros with clarity." },
    { icon: MessageCircle, title: "AI Coach", desc: "Ask training questions and generate plans. Real coaches on call." },
    { icon: LineChart, title: "Progress Analytics", desc: "Weight, fat, and muscle trends that keep you on track." },
    { icon: Activity, title: "Gym Community", desc: "Share wins, support others, and train as a team." },
  ];
  const programs = [
    { title: "Strength Build", desc: "Lean muscle with controlled progression.", icon: Dumbbell, img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80" },
    { title: "Fat Loss", desc: "Smart cardio plus HIIT for lasting shape.", icon: Flame, img: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80" },
    { title: "Mobility Reset", desc: "Recover better and move without limits.", icon: HeartPulse, img: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80" },
    { title: "Power Endurance", desc: "Raise your ceiling for long sessions.", icon: Timer, img: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=800&q=80" },
  ];
  const coaches = [
    { name: "Blake Hunter", role: "Strength Coach", img: "https://images.unsplash.com/photo-1563122870-6b0b48a0af09?w=400&q=80" },
    { name: "Liam CrossFit", role: "Conditioning", img: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&q=80" },
    { name: "Logan Torque", role: "Body Recomp", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80" },
  ];
  const testimonials = [
    {
      quote:
        "InBody plus workout logs show exactly how I progress each week. The AI Coach is a game changer.",
      name: "Hannah T.",
    },
    {
      quote:
        "Clear training and nutrition guidance with real coach backup. I feel stronger and more confident.",
      name: "Marcus V.",
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1b1f14,_#0f120c_55%,_#090b07_100%)] text-slate-100">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="size-10 rounded-xl object-cover" />
            <div>
              <div className="font-semibold tracking-wide">HL Fitness</div>
              <div className="text-[11px] text-slate-300 flex items-center gap-1">
                <MapPin className="size-3" /> 303 Le Thanh Nghi, Da Nang
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm" className="text-slate-100 hover:text-slate-900 hover:bg-yellow-300">
              <Link to="/auth" search={{ mode: "login", redirect: "/feed" }}>Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
              <Link to="/get-started">Join now</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-14 md:py-24 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-yellow-200 mb-6 animate-fade-in">
            <Sparkles className="size-3" /> Built for HL Fitness 303 Le Thanh Nghi members
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold leading-[1.05] animate-fade-up">
            Sculpt your body, <span className="text-yellow-300">elevate</span> your spirit.
          </h1>
          <p className="mt-6 text-base md:text-lg text-slate-300 max-w-xl animate-fade-up stagger-1">
            Track workouts, log meals, analyze your InBody results, and chat with your AI Coach — everything you need to crush your goals in one app.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up stagger-2">
            <Button asChild size="lg" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300 relative group overflow-hidden">
              <Link to="/get-started">
                <span className="relative z-10 flex items-center gap-2">Start for free <ArrowRight className="size-4" /></span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-yellow-200/50 text-yellow-200 hover:border-yellow-300 hover:text-yellow-100 hover:bg-yellow-300/10 hover:shadow-[0_0_18px_rgba(250,204,21,0.35)]"
            >
              <Link to="/auth" search={{ mode: "login", redirect: "/feed" }}>I already have an account</Link>
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 border-y border-white/10 py-6 gap-6 text-center animate-fade-up stagger-3">
            <div>
              <div className="text-2xl font-bold text-yellow-300">10k+</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Active Members</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-300">24/7</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">AI Coaching</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-300">8+</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Expert Trainers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-300">100%</div>
              <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Commitment</div>
            </div>
          </div>
        </div>
        
        {/* App Preview Graphic */}
        <div className="relative animate-fade-up stagger-2 hidden md:block">
          <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-tr from-yellow-400/20 via-transparent to-yellow-200/10 blur-2xl" />
          <div className="relative rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_#1a2011,_#0c0f0a_60%)] p-2 shadow-2xl overflow-hidden aspect-[4/5] transform perspective-[1000px] rotate-y-[-10deg] rotate-x-[5deg]">
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/80 z-10 pointer-events-none" />
            
            {/* Mock App Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
               <div className="flex items-center gap-2">
                 <div className="size-6 bg-yellow-400 rounded-md grid place-items-center"><Activity className="size-3 text-yellow-950"/></div>
                 <span className="text-sm font-semibold">HL Fitness</span>
               </div>
               <div className="size-6 bg-white/10 rounded-full flex items-center justify-center text-xs">V</div>
            </div>

            {/* Mock App Content */}
            <div className="p-4 space-y-4">
              <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-yellow-300 font-semibold uppercase">Daily Goal</span>
                  <span className="text-xs text-yellow-300">75%</span>
                </div>
                <div className="h-1.5 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 w-3/4 rounded-full"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <Scale className="size-4 text-slate-400 mb-2" />
                  <div className="text-lg font-bold">76.2 <span className="text-xs text-slate-500 font-normal">kg</span></div>
                  <div className="text-[10px] text-yellow-400">&darr; 1.2kg this month</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <Flame className="size-4 text-orange-400 mb-2" />
                  <div className="text-lg font-bold">2,450 <span className="text-xs text-slate-500 font-normal">kcal</span></div>
                  <div className="text-[10px] text-slate-400">Target hit</div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-3">AI Coach Suggestion</div>
                <div className="flex gap-3">
                  <div className="size-8 bg-yellow-400 rounded-full grid place-items-center flex-shrink-0">
                    <MessageCircle className="size-4 text-yellow-950" />
                  </div>
                  <div className="text-xs text-slate-300">
                    "Great work on hitting your protein goals! Ready for leg day tomorrow?"
                  </div>
                </div>
              </div>

              {/* Decorative Chart Mock */}
              <div className="h-20 w-full flex items-end gap-1 px-2 opacity-50">
                 {[40, 60, 45, 80, 50, 90, 75].map((h, i) => (
                   <div key={i} className="flex-1 bg-yellow-400/50 rounded-t-sm" style={{ height: `${h}%` }}></div>
                 ))}
              </div>
            </div>
            
            {/* Mock Floating elements */}
            <div className="absolute top-1/2 -right-8 bg-black/80 border border-white/10 backdrop-blur-md rounded-xl p-3 shadow-xl z-20 flex items-center gap-3 transform -translate-y-1/2">
              <BadgeCheck className="text-yellow-400 size-5" />
              <div>
                <div className="text-xs font-bold">Workout Logged</div>
                <div className="text-[10px] text-slate-400">Push Day A completed</div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/20">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-5xl font-semibold mb-4">How it works</h2>
            <p className="text-slate-400 text-lg">A seamless loop between putting in the work and seeing the results.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
             {[
               { no: "01", title: "Assessment", desc: "Start with an InBody scan. Upload your stats to set a baseline." },
               { no: "02", title: "Plan", desc: "Our AI Coach builds a personalized workout & nutrition protocol." },
               { no: "03", title: "Action", desc: "Log your daily meals and track your sets/reps in the gym." },
               { no: "04", title: "Progress", desc: "Analyze trends, adjust macros, and celebrate your wins." },
             ].map((step) => (
               <div key={step.no} className="relative group">
                 <div className="text-6xl font-black text-white/5 absolute -top-6 -left-2 group-hover:text-yellow-400/10 transition-colors">{step.no}</div>
                 <div className="relative z-10">
                   <div className="text-xl font-semibold mb-2 text-yellow-100">{step.title}</div>
                   <div className="text-slate-400 text-sm leading-relaxed">{step.desc}</div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3 animate-fade-up">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10">
                <div className="size-11 rounded-xl bg-yellow-400/20 text-yellow-300 grid place-items-center mb-4">
                  <Icon className="size-5" />
                </div>
                <div className="font-semibold">{f.title}</div>
                <div className="mt-2 text-sm text-slate-300">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12 grid gap-6 lg:grid-cols-[1fr_1.1fr] items-center">
        <div className="space-y-4">
          <div className="text-yellow-300 text-sm uppercase tracking-[0.2em]">Train Smarter</div>
          <h2 className="text-3xl md:text-4xl font-semibold">Unleash your potential</h2>
          <p className="text-slate-300">
            Plans are personalized by InBody, training history, eating habits, and real goals.
            Weekly reports keep you aligned with every measurable win.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {programs.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="group relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/10 h-36">
                  <div className="absolute inset-0 z-0">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-500 grayscale group-hover:grayscale-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  </div>
                  <div className="relative z-10 p-4 h-full flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="size-4 text-yellow-300" />
                      <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                    </div>
                    <div className="text-xs text-slate-300 line-clamp-2">{item.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-yellow-400/10 via-transparent to-white/5 p-6">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-black/40 border border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-yellow-400 text-yellow-950 grid place-items-center">
                  <Dumbbell className="size-5" />
                </div>
                <div>
                  <div className="font-semibold">Workout Dashboard</div>
                  <div className="text-xs text-slate-300">Log sets, reps, and rest time.</div>
                </div>
              </div>
              <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                <div className="h-2 w-2/3 rounded-full bg-yellow-400" />
              </div>
            </div>
            <div className="rounded-2xl bg-black/40 border border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-yellow-400 text-yellow-950 grid place-items-center">
                  <LineChart className="size-5" />
                </div>
                <div>
                  <div className="font-semibold">InBody Progress</div>
                  <div className="text-xs text-slate-300">Track weight, fat, and muscle.</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-300">
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-yellow-300 font-semibold">-2.4%</div>
                  <div>Body fat</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-yellow-300 font-semibold">+1.8kg</div>
                  <div>Lean mass</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="text-yellow-300 font-semibold">+6%</div>
                  <div>Endurance</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="text-yellow-300 text-sm uppercase tracking-[0.2em]">Expert Coaches</div>
            <h2 className="text-3xl md:text-4xl font-semibold">Your goals, their expertise</h2>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-yellow-200/50 text-yellow-200 hover:border-yellow-300 hover:text-yellow-100 hover:bg-yellow-300/10 hover:shadow-[0_0_18px_rgba(250,204,21,0.35)]"
          >
            <Link to="/get-started">
              Connect with a coach <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {coaches.map((coach) => (
            <div key={coach.name} className="group relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/10 h-72">
              <div className="absolute inset-0 z-0">
                <img src={coach.img} alt={coach.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 grayscale group-hover:grayscale-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
              </div>
              <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                <div className="text-xl font-bold text-slate-100">{coach.name}</div>
                <div className="text-sm text-yellow-400 font-medium tracking-wide mb-2">{coach.role}</div>
                <div className="text-xs text-slate-300">
                  Focused on technique analysis and InBody aligned plans.
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-r from-yellow-400/20 via-white/5 to-transparent p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-yellow-300 text-sm uppercase tracking-[0.2em]">Success Stories</div>
              <h2 className="text-3xl md:text-4xl font-semibold">Your success, our inspiration</h2>
              <p className="mt-2 text-slate-300 max-w-xl">
                From daily logs to InBody reports, every member has a story worth sharing.
              </p>
            </div>
            <Button asChild size="lg" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
              <Link to="/get-started">Start today</Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-2xl border border-white/10 bg-black/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/5">
                <div className="flex items-center gap-2 text-yellow-300">
                  <Star className="size-4" />
                  <Star className="size-4" />
                  <Star className="size-4" />
                  <Star className="size-4" />
                  <Star className="size-4" />
                </div>
                <p className="mt-4 text-sm text-slate-200">“{item.quote}”</p>
                <div className="mt-4 text-xs text-slate-400">— {item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-8 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div>© HL Fitness — 303 Le Thanh Nghi, Da Nang</div>
          <div>Built for members and coaches of this location.</div>
        </div>
      </footer>
    </div>
  );
}
