import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CanteenStaff({ schoolSlug }) {
  const currentSlug = schoolSlug || window.location.pathname.split('/')[2] || 'default-school';

  const [staffOperator, setStaffOperator] = useState('Loading Staff...');
  const [canteenCatalog, setCanteenCatalog] = useState([]);
  const [ordersHistory, setOrdersHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('queue');

  // Form states for catalog items
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('Hot Food');
  const [formCalories, setFormCalories] = useState('');
  const [formAllergens, setFormAllergens] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formPal, setFormPal] = useState('');

  useEffect(() => {
    fetchStaffUser();
    fetchCatalog();
    fetchOrders();

    const channel = supabase
      .channel('staff-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteen_items', filter: `school_slug=eq.${currentSlug}` }, () => fetchCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteen_orders', filter: `school_slug=eq.${currentSlug}` }, () => fetchOrders())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentSlug]);

  // 🔒 Fetch authenticated staff operator profile
  const fetchStaffUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      setStaffOperator(profile?.full_name || user.email || 'Kitchen Operator');
    } catch (err) {
      console.error('Error fetching staff user:', err.message);
    }
  };

  const fetchCatalog = async () => {
    const { data } = await supabase.from('canteen_items').select('*').eq('school_slug', currentSlug);
    if (data) setCanteenCatalog(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('canteen_orders').select('*').eq('school_slug', currentSlug).order('created_at', { ascending: false });
    if (data) setOrdersHistory(data);
  };

  const handleItemSubmission = async (e) => {
    e.preventDefault();
    const newItem = {
      school_slug: currentSlug,
      name: formTitle,
      price: parseFloat(formPrice),
      category: formCategory,
      calories: parseInt(formCalories) || 350,
      allergens: formAllergens.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      ingredients: formIngredients || 'Standard ingredients manifest.',
      pal: formPal || 'Standard PAL warning.'
    };

    const { error } = await supabase.from('canteen_items').insert([newItem]);
    if (error) {
      alert('Error adding item: ' + error.message);
    } else {
      setFormTitle('');
      setFormPrice('');
      setFormCalories('');
      setFormAllergens('');
      setFormIngredients('');
      setFormPal('');
      setActiveTab('queue');
    }
  };

  const deleteCatalogItem = async (id) => {
    await supabase.from('canteen_items').delete().eq('id', id);
  };

  const approveOrder = async (id) => {
    const { error } = await supabase
      .from('canteen_orders')
      .update({ 
        status: 'Fulfilled & Verified',
        approved_by: staffOperator,
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      alert('Error approving order: ' + error.message);
    } else {
      fetchOrders();
    }
  };

  const pendingOrders = ordersHistory.filter(o => o.status.includes('Pending'));
  const totalRevenue = ordersHistory.reduce((acc, ord) => acc + (ord.total || 0), 0);

  return (
    <div className="bg-[#020617] text-slate-300 font-sans min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        
        {/* Tenant Header Tag & Operator Identity */}
        <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded flex justify-between items-center text-xs">
          <span className="text-sky-400 font-bold uppercase tracking-wider">🏢 Tenant: <span className="font-mono text-slate-200">{currentSlug}</span></span>
          <span className="text-slate-300">Kitchen Operator: <strong className="text-emerald-400 font-mono">{staffOperator}</strong></span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 text-xs font-medium border-b border-slate-900 pb-2">
          <button onClick={() => setActiveTab('queue')} className={`pb-1 ${activeTab === 'queue' ? 'text-sky-400 font-semibold border-b-2 border-sky-500' : 'text-slate-500'}`}>Live Student Queue</button>
          <button onClick={() => setActiveTab('catalog')} className={`pb-1 ${activeTab === 'catalog' ? 'text-sky-400 font-semibold border-b-2 border-sky-500' : 'text-slate-500'}`}>Menu Catalog Control</button>
          <button onClick={() => setActiveTab('ledger')} className={`pb-1 ${activeTab === 'ledger' ? 'text-sky-400 font-semibold border-b-2 border-sky-500' : 'text-slate-500'}`}>Compliance & Audit Logs</button>
        </div>

        {/* Tab 1: Live Student Queue */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-12 bg-[#030712] border border-slate-900 rounded p-5 shadow-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-200 uppercase">Live Student Order Queue (Kitchen Prep View)</h2>
                <span className="bg-amber-500/10 text-amber-400 text-[9px] px-2 py-0.5 rounded border border-amber-500/20 font-mono">{pendingOrders.length} Pending Prep</span>
              </div>

              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-900">
                      <th className="pb-2 font-semibold text-[10px] uppercase">Student Name & Grade</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Order Ref & Time</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Ordered Items</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Authorized Parent</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Kitchen Sign-off</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {ordersHistory.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3">
                          <span className="text-slate-100 font-bold text-sm block">{ord.student_name}</span>
                          <span className="bg-sky-500/10 text-sky-300 text-[10px] px-1.5 py-0.5 rounded border border-sky-500/20 font-mono">{ord.grade_level || 'N/A'}</span>
                        </td>
                        <td className="py-3 text-slate-400 font-mono text-[11px]">{ord.order_ref}<br/><span className="text-[10px] text-slate-500">{new Date(ord.created_at).toLocaleTimeString()}</span></td>
                        <td className="py-3 text-slate-300 max-w-[250px] truncate">{ord.items.map(i => i.name).join(', ')}</td>
                        <td className="py-3 text-sky-400 text-[11px]">{ord.parent_name || 'Verified Guardian'}</td>
                        <td className="py-3 text-slate-300 font-mono text-[11px]">
                          {ord.approved_by ? (
                            <span className="text-emerald-400">✔ {ord.approved_by}</span>
                          ) : (
                            <span className="text-amber-400 italic">Awaiting Prep...</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {ord.status.includes('Pending') ? (
                            <button onClick={() => approveOrder(ord.id)} className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded uppercase">
                              Mark Prepared
                            </button>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-500/20 font-mono">Ready / Packed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Catalog Control */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-5 bg-[#030712] border border-slate-900 rounded p-5 shadow-2xl flex flex-col gap-4">
              <h2 className="text-xs font-bold text-slate-200 uppercase">Menu Catalog Control</h2>
              <form onSubmit={handleItemSubmission} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Item Title</label>
                  <input type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., Gourmet Beef Burger" className="w-full bg-[#070c19] border border-slate-900 rounded p-2 text-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Unit Price (AUD)</label>
                    <input type="number" step="0.01" required value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="$0.00" className="w-full bg-[#070c19] border border-slate-900 rounded p-2 text-slate-200 font-mono" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Category</label>
                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full bg-[#070c19] border border-slate-900 rounded p-2 text-slate-200">
                      <option>Hot Food</option>
                      <option>Sandwiches</option>
                      <option>Drinks</option>
                      <option>Confectionery</option>
                      <option>Specials</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Calories (kcal)</label>
                    <input type="number" value={formCalories} onChange={e => setFormCalories(e.target.value)} placeholder="350" className="w-full bg-[#070c19] border border-slate-900 rounded p-2 text-slate-200 font-mono" />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Allergen Tags</label>
                    <input type="text" value={formAllergens} onChange={e => setFormAllergens(e.target.value)} placeholder="gluten, dairy" className="w-full bg-[#070c19] border border-slate-900 rounded p-2 text-slate-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Ingredients Manifest</label>
                  <textarea rows="2" value={formIngredients} onChange={e => setFormIngredients(e.target.value)} placeholder="Exact components..." className="w-full bg-[#070c19] border border-slate-900 rounded p-2 text-slate-200"></textarea>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">PAL Warnings</label>
                  <input type="text" value={formPal} onChange={e => setFormPal(e.target.value)} placeholder="Traces of soy..." className="w-full bg-[#070c19] border border-slate-900 rounded p-2 text-slate-200" />
                </div>
                <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold py-2 rounded text-[10px] tracking-wider uppercase mt-1">
                  Save & Publish FSANZ Item to Supabase
                </button>
              </form>
            </section>

            <section className="lg:col-span-7 bg-[#030712] border border-slate-900 rounded p-5 shadow-2xl flex flex-col gap-4">
              <h2 className="text-xs font-bold text-slate-200 uppercase">Live Supabase FSANZ Menu Catalog</h2>
              <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-1">
                {canteenCatalog.map((item) => (
                  <div key={item.id} className="bg-[#070c19] border border-slate-900 p-3 rounded flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-200">{item.name}</strong>
                        <span className="text-emerald-400 font-mono">${item.price.toFixed(2)}</span>
                        <span className="text-[10px] text-sky-400 font-mono">({item.calories} kcal)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Allergens: {item.allergens?.join(', ') || 'None'}</p>
                    </div>
                    <button onClick={() => deleteCatalogItem(item.id)} className="text-rose-400 hover:text-rose-300 text-[10px] border border-rose-500/20 bg-rose-500/10 px-2 py-1 rounded">Remove</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Tab 3: Compliance & Audit Logs */}
        {activeTab === 'ledger' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-12 bg-[#030712] border border-slate-900 rounded p-5 shadow-2xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <h2 className="text-xs font-bold text-slate-200 uppercase">Audited Financials & Legal Traceability Logs</h2>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Total Turnover (AUD)</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">${totalRevenue.toFixed(2)}</span>
                </div>
              </div>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-900">
                      <th className="pb-2 font-semibold text-[10px] uppercase">Timestamp</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Order Ref</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Student Name & Grade</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Authorized Parent (Audit Trail)</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase">Staff Sign-off</th>
                      <th className="pb-2 font-semibold text-[10px] uppercase text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {ordersHistory.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 text-slate-400 font-mono">{new Date(ord.created_at).toLocaleString()}</td>
                        <td className="py-3 text-slate-200 font-mono">{ord.order_ref}</td>
                        <td className="py-3">
                          <span className="text-slate-200 font-bold">{ord.student_name}</span>
                          <span className="text-sky-400 text-[10px] ml-1 font-mono">({ord.grade_level})</span>
                        </td>
                        <td className="py-3 text-sky-300">{ord.parent_name}</td>
                        <td className="py-3 text-emerald-400 font-mono text-[11px]">{ord.approved_by || 'Pending'}</td>
                        <td className="py-3 text-right text-emerald-400 font-mono font-bold">${(ord.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}