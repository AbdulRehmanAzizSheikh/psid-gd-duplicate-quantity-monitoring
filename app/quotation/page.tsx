"use client";

import Link from "next/link";

// /quotation — trustworthy, easy-to-read project quotation for client + senior management.
export default function QuotationPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      {/* Toolbar */}
      <div className="print-hide mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link href="/" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">← Live Demo (`/`)</Link>
          <Link href="/flow" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50">System Walkthrough (`/flow`)</Link>
        </div>
        <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          🖨 Print / Save as PDF
        </button>
      </div>

      {/* Header */}
      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Project Quotation</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Project Quotation — PSID &amp; GD Duplicate &amp; Quantity Monitoring System</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          A customs-operations web system that <b>stops duplicate PSID / GD entries</b>, <b>catches over-quantity across multiple vehicles</b>,
          and keeps a clear, auditable record with customs-paid proofs.
        </p>
      </header>

      {/* Executive summary */}
      <Section title="Executive Summary" icon="📋">
        <ul className="space-y-2 text-sm text-slate-700">
          <li><b>Current state:</b> a <b>live functional demo</b> is already running (dashboard at <code>/</code>, client walkthrough at <code>/flow</code>, developer guide at <code>/flow/dev</code>).</li>
          <li><b>Final production build:</b> the delivered version will be <b>customized</b> to your exact operational workflow, <b>hardened for security</b> (authentication / RBAC, secure environment config), and polished for real-world use.</li>
        </ul>
        {/* AI-accelerated development */}
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">⚡ AI-Accelerated Development — affordable, not compromised</p>
          <p className="mt-1 text-sm text-indigo-900/80">
            By leveraging modern <b>AI-assisted engineering workflows</b>, development is <b>faster</b> and offered at an
            <b> affordable, cost-effective price</b> — <b>without</b> compromising on code quality or enterprise-grade security.
            Efficiency comes from tooling, not shortcuts on robustness.
          </p>
        </div>
      </Section>

      {/* Pricing packages */}
      <Section title="Pricing Packages" icon="💳">
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <b>Estimated / Indicative Pricing.</b> All prices are <b>estimated</b>, <b>flexible</b>, and <b>subject to final requirement confirmation</b>.
          Final quote is <b>customizable and adjustable to match your budget</b>. Currency: PKR.
        </p>

        {/* Package 1 */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">Package 1 — Standard Secure Web Portal (Password-Protected Access)</h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">PKR 65,000 – 85,000</span>
          </div>
          <p className="mt-1 text-xs italic text-slate-500">Estimated · final quote customizable per budget &amp; scope.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            <li>✓ Complete <b>responsive</b> web app — works smoothly on <b>Laptop &amp; Mobile browsers</b>.</li>
            <li>✓ <b>Multi-vehicle PSID &amp; GD quantity monitoring</b> with automatic summation and <b>Over-Quantity Red Alerts</b> (even over by 1 KG; subsequent-vehicle-after-completion).</li>
            <li>✓ <b>Duplicate PSID</b>, <b>Duplicate GD</b>, and <b>Duplicate Vehicle</b> detection with clear warnings.</li>
            <li>✓ <b>MongoDB cloud database</b> + <b>Cloudinary</b> custom-paid proof upload &amp; <b>clickable proof links</b>.</li>
            <li>✓ <b>Security:</b> strictly restricted access — secure <b>authentication / password protection</b>; no unauthorized person can open or view the system.</li>
          </ul>
        </div>

        {/* Package 2 */}
        <div className="mb-4 rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">Package 2 — Enterprise RBAC Edition (Role-Based Access Control &amp; Multi-User)</h3>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-800">PKR 115,000 – 150,000</span>
          </div>
          <p className="mt-1 text-xs italic text-slate-500">Higher scope due to full multi-user permission architecture; flexible based on exact requirements.</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">Includes everything in Package 1, plus:</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li>✓ <b>Owner / Super Admin Account:</b> full control to <b>create, manage, and deactivate</b> staff/member accounts.</li>
            <li>✓ <b>Granular Role-Based Permissions (RBAC):</b> assign specific permissions per user. Examples:</li>
          </ul>
          <ul className="ml-6 mt-1 list-disc space-y-1 text-sm text-slate-600">
            <li><b>Full access</b> for managers / owners.</li>
            <li><b>Restricted access</b> for operators — e.g. permission <b>only to add Vehicles</b>, <b>only manage PSIDs</b>, or <b>only manage GDs</b>.</li>
          </ul>
          <ul className="mt-1.5 space-y-1.5 text-sm text-slate-700">
            <li>✓ <b>Activity &amp; accountability tracking</b> so the owner can monitor staff work accurately.</li>
          </ul>
        </div>

        {/* Custom budget callout */}
        <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-5 text-center">
          <p className="text-sm font-bold text-indigo-900">💬 Have a specific budget or custom requirement?</p>
          <p className="mt-1 text-sm text-indigo-900/80">
            We can <b>tailor the features</b> and prepare a <b>customized quotation</b> so your system gets built smoothly
            <b> within your budget</b>.
          </p>
        </div>
      </Section>

      {/* Security commitment */}
      <Section title="Data &amp; Access Security" icon="🔒">
        <ul className="space-y-2 text-sm text-slate-700">
          <li><b>Demo vs production:</b> the current app is <b>open only for demo purposes</b>; production deployment enforces <b>strict login authentication</b> (password-protected access / RBAC).</li>
          <li><b>No public access:</b> system is restricted to authorized users only.</li>
          <li><b>Secure environment configuration</b> for <b>MongoDB</b> &amp; <b>Cloudinary</b> — credentials kept in environment variables, never in source; least-privilege access; secrets not committed.</li>
        </ul>
      </Section>

      {/* Timeline & support */}
      <Section title="Delivery Timeline &amp; Support" icon="⏱️">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Delivery Timeline</p>
            <p className="mt-1 text-lg font-bold text-indigo-700">1 Week (7 Working Days)</p>
            <p className="mt-1 text-xs text-slate-500">after final confirmation of all requirements and project approval.</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Free Bug Fixing &amp; Support</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">60 Days Free</p>
            <p className="mt-1 text-xs text-slate-500">any technical issue or error in delivered features is fixed <b>100% free of cost</b> for 60 days post-delivery.</p>
          </div>
        </div>
      </Section>

      {/* Terms */}
      <Section title="Payment Terms, Cloud Costs &amp; Future Updates" icon="📄">
        <ul className="space-y-2 text-sm text-slate-700">
          <li><b>Payment terms:</b> <b>50% advance</b> upon approval to initiate production build; <b>50% upon final delivery</b> and handover.</li>
          <li><b>Hosting / domain / cloud infrastructure:</b> initial deployment can start on <b>free / starter tiers</b>. If storage or traffic scales, actual <b>domain, hosting, MongoDB, or Cloudinary</b> charges apply as per usage — or an <b>optional annual maintenance plan</b>. These are pass-through provider costs, separate from the build price.</li>
          <li><b>Future updates &amp; new features:</b> minor adjustments during the <b>60-day support window</b> are covered. <b>Major new modules</b> or post-launch feature additions are <b>quoted transparently before work begins</b>.</li>
        </ul>
      </Section>

      <p className="mt-6 text-center text-xs text-slate-400">Estimated / indicative pricing · subject to final requirement confirmation · prepared for client &amp; senior-management review.</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-slate-900"><span className="mr-2">{icon}</span>{title}</h2>
      {children}
    </section>
  );
}
