import React from "react";
import { Button } from "@/components/ui/button";

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

export default function About() {
  const sections = [
    {
      title: "About the Founder",
      body: `I'm Jacob, an aerospace engineering student working on real rocket engines. I started EX3D Prints because I wanted high-quality models of the rockets I care about, and I couldn't find the kind I wanted. So I built them.\n\nThis started with rockets like the Saturn V and SLS, but the goal is bigger than that.`,
    },
    {
      title: "What EX3D Prints Is",
      body: `EX3D Prints is a marketplace where you can buy real 3D printed products without needing a printer yourself.\n\nInstead of downloading files and printing them, you can just order the item and have it made and shipped to you.`,
    },
    {
      title: "How It Works",
      body: `People across the US can sign up as makers and use their own 3D printers to fulfill orders.\n\nWhen someone places an order, it gets routed to a qualified local maker who prints and ships the item.\n\nThis allows makers to earn income using equipment they already own, while customers get faster delivery.`,
    },
    {
      title: "Designers",
      body: `Designers can upload their own models to EX3D Prints and sell them as real physical products.\n\nInstead of just selling files, their designs are turned into actual items that customers can order.\n\nDesigners get exposure and earn from every product sold.`,
    },
    {
      title: "Where This Is Going",
      body: `Right now, EX3D Prints is focused on building high-quality products, starting with space-related models like rockets.\n\nOver time, the goal is to expand into more categories while keeping the same system: real designers, real makers, and real products.`,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-50 via-white to-teal-50 py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5">Built by Someone Who Loves Space</h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            EX3D Prints turns real engineering and great designs into products you can actually own.
          </p>
          <div className="mt-10 w-32 h-32 rounded-full overflow-hidden border-4 border-teal-200 mx-auto">
            <img src={FOUNDER_IMAGE} alt="Jacob" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Content sections */}
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-16">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-3">{s.title}</h2>
            {s.body.split("\n\n").map((para, i) => (
              <p key={i} className="text-slate-700 text-lg leading-relaxed mb-4">{para}</p>
            ))}
          </div>
        ))}

        <div className="text-center pt-4">
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 text-lg"
            onClick={() => { window.location.href = "/SaturnV"; window.scrollTo(0, 0); }}
          >
            See the Rocket Collection
          </Button>
        </div>
      </div>
    </div>
  );
}