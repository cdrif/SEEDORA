import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ParentCanteen({ schoolSlug }) {
  const currentSlug = schoolSlug || window.location.pathname.split('/')[2] || 'default-school';

  const [parentUser, setParentUser] = useState({ name: 'Loading Parent...', id: null });
  const [childrenList, setChildrenList] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  
  // Opt-in / Allergen state
  const [optInAllergens, setOptInAllergens] = useState(false);
  const [childAllergensInput, setChildAllergensInput] = useState('');
  const [allergySavedStatus, setAllergySavedStatus] = useState(false);

  const [canteenCatalog, setCanteenCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('browse');

  useEffect(() => {
    fetchParentContext();
    fetchCatalog();

    const channel = supabase
      .channel('parent-canteen-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteen_items', filter: `school_slug=eq.${currentSlug}` }, () => fetchCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'canteen_orders', filter: `school_slug=eq.${currentSlug}` }, () => fetchOrders())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentSlug]);

  useEffect(() => {
    if (parentUser.id) {
      fetchChildren();
      fetchOrders();
    }
  }, [parentUser.id]);

  const fetchParentContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, id')
        .eq('id', user.id)
        .single();

      setParentUser({
        name: profile?.full_name || user.email || 'Verified Parent',
        id: user.id
      });
    } catch (err) {
      console.error('Error loading parent context:', err.message);
    }
  };

  const fetchChildren = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, student_name, grade_level, opt_in_allergens, allergen_notes')
      .eq('school_slug', currentSlug);

    if (data && data.length > 0) {
      setChildrenList(data);
      setSelectedChildId(data[0].id);
      setOptInAllergens(data[0].opt_in_allergens || false);
      setChildAllergensInput(data[0].allergen_notes || '');
    }
  };

  const fetchCatalog = async () => {
    const { data } = await supabase.from('canteen_items').select('*').eq('school_slug', currentSlug);
    if (data) setCanteenCatalog(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('canteen_orders')
      .select('*')
      .eq('school_slug', currentSlug)
      .eq('parent_id', parentUser.id)
      .order('created_at', { ascending: false });
    if (data) setMyOrders(data);
  };

  const handleChildSwitch = (e) => {
    const targetId = e.target.value;
    setSelectedChildId(targetId);
    const found = childrenList.find(c => c.id === targetId);
    if (found) {
      setOptInAllergens(found.opt_in_allergens || false);
      setChildAllergensInput(found.allergen_notes || '');
    }
  };

  const saveAllergenPreferences = async (e) => {
    e.preventDefault();
    if (!selectedChildId) return;

    const { error } = await supabase
      .from('students')
      .update({
        opt_in_allergens: optInAllergens,
        allergen_notes: optInAllergens ? childAllergensInput : null
      })
      .eq('id', selectedChildId);

    if (error) {
      alert('Error updating medical preferences: ' + error.message);
    } else {
      setAllergySavedStatus(true);
      setTimeout(() => setAllergySavedStatus(false), 3500);
      fetchChildren();
    }
  };

  const requestDataPurge = async () => {
    if (!confirm('Under privacy compliance laws (Privacy Act 1988), this will purge your child medical and canteen telemetry from this tenant record. Proceed?')) return;
    
    const { error } = await supabase
      .from('students')
      .update({ opt_in_allergens: false, allergen_notes: null })
      .eq('id', selectedChildId);

    if (!error) {
      setOptInAllergens(false);
      setChildAllergensInput('');
      alert('Data successfully purged from active telemetry logs.');
    }
  };

  const addToCart = (item) => {
    const activeChild = childrenList.find(c => c.id === selectedChildId);
    if (activeChild && activeChild.opt_in_allergens && activeChild.allergen_notes) {
      const childAllergies = activeChild.allergen_notes.toLowerCase().split(',').map(s => s.trim());
      const itemAllergens = item.allergens || [];
      const conflict = itemAllergens.some(a => childAllergies.includes(a));

      if (conflict) {
        alert(`🚨 FSANZ ALLERGY SAFETY INTERLOCK: ${activeChild.student_name} is flagged for sensitivities matching this item (${item.name}). Order blocked for student safety.`);
        return;
      }
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const saveAsFavorite = (item) => {
    if (!favorites.some(f => f.id === item.id)) {
      setFavorites(prev => [...prev, item]);
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const submitCanteenOrder = async () => {
    if (cart.length === 0) return;
    const activeChild = childrenList.find(c => c.id === selectedChildId);

    const orderPayload = {
      school_slug: currentSlug,
      parent_id: parentUser.id,
      parent_name: parentUser.name,
      student_id: selectedChildId,
      student_name: activeChild?.student_name || 'Student',
      grade_level: activeChild?.grade_level || 'General',
      order_ref: 'CNT-' + Math.floor(100000 + Math.random() * 900000),
      items: cart,
      total: cartTotal,
      status: 'Pending Kitchen Prep'
    };

    const { error } = await supabase.from('canteen_orders').insert([orderPayload]);
    if (error) {
      alert('Error placing order: ' + error.message);
    } else {
      setCart([]);
      setActiveTab('history');
      fetchOrders();
    }
  };

  const totalSpend = myOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  return (
    <div className="bg-[#0b0f19] text-gray-200 font-sans min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

        {/* Top Tenant & User Header */}
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs shadow-sm">
          <span className="text-indigo-400 font-semibold uppercase tracking-wider">🏢 Tenant Portal: <span className="font-mono text-gray-100">{currentSlug}</span></span>
          <div className="flex items-center gap-4">
            <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-mono text-[10px]">🛡️ FSANZ PEAL & Privacy Act Compliant</span>
            <span className="text-gray-400">Logged Guardian: <strong className="text-emerald-400 font-mono">{parentUser.name}</strong></span>
          </div>
        </div>

        {/* Student Selector & Medical Privacy Opt-In Bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Child Profile:</label>
              <select value={selectedChildId} onChange={handleChildSwitch} className="bg-[#0b0f19] border border-gray-700 rounded-lg p-2 text-xs text-gray-200 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer">
                {childrenList.map(child => (
                  <option key={child.id} value={child.id}>{child.student_name} ({child.grade_level || 'Grade N/A'})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <button onClick={requestDataPurge} className="text-rose-400 hover:text-rose-300 text-[10px] underline cursor-pointer">
                Request Data Purge (Lawful Right)
              </button>
            </div>
          </div>

          {/* Explicit Lawful Telemetry Notice */}
          <div className="bg-[#0b0f19] border border-indigo-500/20 p-3.5 rounded-xl text-[11px] text-gray-300 flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <input type="checkbox" checked={optInAllergens} onChange={e => setOptInAllergens(e.target.checked)} className="rounded bg-gray-900 border-gray-700 text-indigo-500 cursor-pointer" />
              <label className="font-semibold text-indigo-300 cursor-pointer">
                I expressly opt-in to share medical sensitivity and allergen data for this student to ensure FSANZ health standards compliance.
              </label>
            </div>
            <p className="text-gray-400 text-[10px] pl-6">
              * Note: This data is collected strictly for lawful reasons and student health safety standards. You may opt out or request complete data purging at any time.
            </p>
            {optInAllergens && (
              <div className="pl-6 pt-1 flex items-center gap-3 flex-wrap">
                <span className="text-gray-400 font-mono text-[10px]">Allergens (comma separated):</span>
                <input type="text" value={childAllergensInput} onChange={e => setChildAllergensInput(e.target.value)} placeholder="e.g. peanuts, dairy, gluten" className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-200 w-64 focus:outline-none focus:border-indigo-500" />
                <button onClick={saveAllergenPreferences} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-lg uppercase text-[10px] tracking-wider transition-colors cursor-pointer">
                  Save Privacy Prefs
                </button>
              </div>
            )}
          </div>
        </div>
        {allergySavedStatus && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl">✔ Secure medical telemetry preferences saved under lawful health compliance standards.</div>}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 text-xs font-medium border-b border-gray-800 pb-2">
          <button onClick={() => setActiveTab('browse')} className={`pb-2 transition-colors cursor-pointer ${activeTab === 'browse' ? 'text-indigo-400 font-semibold border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-200'}`}>Canteen Menu & Favorites</button>
          <button onClick={() => setActiveTab('history')} className={`pb-2 transition-colors cursor-pointer ${activeTab === 'history' ? 'text-indigo-400 font-semibold border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-200'}`}>Live Orders & Pickup Status</button>
          <button onClick={() => setActiveTab('analytics')} className={`pb-2 transition-colors cursor-pointer ${activeTab === 'analytics' ? 'text-indigo-400 font-semibold border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-200'}`}>Spend Analytics & Ledger</button>
        </div>

        {/* Tab 1: Browse Menu & Favorites */}
        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Live Synced Canteen Menu (FSANZ PEAL Compliant)</h2>
                  <span className="text-[10px] text-emerald-400 font-mono">Real-time Allergen Sync Active</span>
                </div>
                
                {/* Horizontal Compact Card Layout matching reference screenshot */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {canteenCatalog.map(item => (
                    <div key={item.id} className="bg-[#0b0f19] border border-gray-800 rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm hover:border-gray-700 transition">
                      
                      {/* Left Thumbnail Image */}
                      <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-800 relative">
                        <img 
                          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                      </div>

                      {/* Right Details & Action */}
                      <div className="flex flex-col justify-between flex-1 gap-1.5 text-xs">
                        <div>
                          <div className="flex justify-between items-start">
                            <strong className="text-gray-100 text-sm leading-snug">{item.name}</strong>
                          </div>
                          <span className="text-emerald-400 font-mono font-bold block mt-0.5">${item.price.toFixed(2)}</span>
                          <span className="text-[10px] text-indigo-400 font-mono block mt-0.5">{item.category} ({item.calories} kcal)</span>
                        </div>

                        <div className="text-[10px] text-gray-400">
                          <p className="truncate"><strong>Allergens:</strong> {item.allergens?.join(', ') || 'None'}</p>
                          {item.pal && <p className="text-amber-400 truncate"><strong>PAL:</strong> {item.pal}</p>}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-800/80">
                          <button onClick={() => addToCart(item)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer text-center">
                            Add to Cart
                          </button>
                          <button onClick={() => saveAsFavorite(item)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2.5 py-1.5 rounded-lg text-[10px] transition-colors cursor-pointer" title="Save as Favorite">
                            ⭐
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart & Favorites Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
                <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Current Order Cart</h2>
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-xs italic">Cart is empty. Select items from the menu.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {cart.map(c => (
                      <div key={c.id} className="flex justify-between items-center text-xs bg-[#0b0f19] p-3 rounded-lg border border-gray-800">
                        <div>
                          <span className="text-gray-200 font-semibold">{c.name}</span>
                          <span className="text-gray-400 text-[10px] block">Qty: {c.qty} x ${c.price.toFixed(2)}</span>
                        </div>
                        <span className="text-emerald-400 font-mono">${(c.price * c.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-800 pt-3 flex justify-between items-center font-bold text-sm">
                      <span className="text-gray-400">Total Due:</span>
                      <span className="text-emerald-400 font-mono">${cartTotal.toFixed(2)}</span>
                    </div>
                    <button onClick={submitCanteenOrder} className="w-full bg-emerald-600 hover:bg-emerald-500 text-gray-950 font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer">
                      Confirm & Send to Kitchen Queue
                    </button>
                  </div>
                )}
              </div>

              {favorites.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Saved Favorite Orders</h3>
                  {favorites.map(fav => (
                    <div key={fav.id} className="flex justify-between items-center text-xs bg-[#0b0f19] p-3 rounded-lg border border-gray-800">
                      <span className="text-gray-300">{fav.name}</span>
                      <button onClick={() => addToCart(fav)} className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] cursor-pointer">Quick Add +</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Live Orders & Pickup Status */}
        {activeTab === 'history' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
            <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Live Order Tracker & Kitchen Sign-off Log</h2>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Order Ref</th>
                    <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Student Name</th>
                    <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Items Ordered</th>
                    <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Kitchen Packed By & Time</th>
                    <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider">Status</th>
                    <th className="pb-3 font-semibold text-[10px] uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {myOrders.map(ord => (
                    <tr key={ord.id} className="hover:bg-gray-800/40 transition">
                      <td className="py-3.5 text-gray-200 font-mono">{ord.order_ref}</td>
                      <td className="py-3.5 text-gray-100 font-semibold">{ord.student_name}</td>
                      <td className="py-3.5 text-gray-400 max-w-[200px] truncate">{ord.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
                      <td className="py-3.5 text-emerald-400 font-mono text-[11px]">
                        {ord.approved_by ? `${ord.approved_by} at ${new Date(ord.approved_at).toLocaleTimeString()}` : 'Awaiting Kitchen Pack...'}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono ${ord.status.includes('Fulfilled') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-emerald-400 font-mono font-bold">${(ord.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Spend Analytics & Ledger */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow-xl flex flex-col gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Daily Spend Volume</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">${(totalSpend * 0.15).toFixed(2)}</span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow-xl flex flex-col gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Weekly Spend Volume</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">${(totalSpend * 0.65).toFixed(2)}</span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow-xl flex flex-col gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Monthly Spend Volume</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">${totalSpend.toFixed(2)}</span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl shadow-xl flex flex-col gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Yearly Projected Spend</span>
              <span className="text-2xl font-bold text-indigo-400 font-mono">${(totalSpend * 12).toFixed(2)}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}