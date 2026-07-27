'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Paperclip, HeadphonesIcon, Send, User, Building2, CheckCircle, XCircle, ChevronDown
} from 'lucide-react';
import { supportService } from '../../services/support';
import type { SupportTicket } from '../../services/support';
import SectionHeader from '../components/SectionHeader';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useBreadcrumbSync } from '../contexts/BreadcrumbContext';

const SupportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Action/Form States
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');

  useBreadcrumbSync([
    { label: 'Operations' },
    { label: 'Support Desk', path: '/admin/support' },
    { label: `Ticket #${ticket?.ticket_number || ''}` },
  ]);

  const fetchTicketDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await supportService.getTicket(id);
      if (res.success && res.data) {
        setTicket(res.data);
      } else {
        toast.error(res.message || 'Failed to load ticket.');
      }
    } catch (err) {
      console.error('Failed to fetch ticket detail:', err);
      toast.error('Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const res = await supportService.getAdmins();
      if (res.success && res.data) {
        setAdmins(res.data);
      }
    } catch (err) {
      console.error('Failed to load admins list:', err);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchAdmins();
  }, [id]);

  const handleAction = async (actionType: string, payload: any) => {
    if (!ticket) return;
    try {
      const res = await supportService.adminAction(ticket.id, {
        action: actionType,
        notes: actionNotes.trim() || undefined,
        ...payload
      });
      if (res.success && res.data) {
        setTicket(res.data);
        setActionNotes('');
        toast.success(`Action '${actionType}' completed successfully.`);
      } else {
        toast.error(res.message || 'Action failed.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || 'Action failed.');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    if (!replyText.trim() && !replyAttachment) {
      toast.warning('Please write a message or attach a file.');
      return;
    }
    setReplyLoading(true);
    try {
      const formData = new FormData();
      if (replyText.trim()) {
        formData.append('message', replyText.trim());
      }
      if (replyAttachment) {
        formData.append('attachment', replyAttachment);
      }
      const res = await supportService.replyTicket(ticket.id, formData);
      if (res.success && res.data) {
        setReplyText('');
        setReplyAttachment(null);
        toast.success('Reply message sent.');
        await fetchTicketDetails();
      } else {
        toast.error(res.message || 'Failed to send reply.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || 'Failed to send reply.');
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading && !ticket) {
    return <div className="py-20 text-center text-xs font-semibold text-slate-400">Loading ticket details...</div>;
  }

  if (!ticket) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-4">
        <HeadphonesIcon className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Ticket Not Found</p>
        <button onClick={() => router.push('/admin/support')} className="text-xs font-bold text-[#005B63] underline">Back to Support Desk</button>
      </div>
    );
  }

  const getStatusBadge = (statusVal: string) => {
    switch (statusVal) {
      case 'open':
        return <StatusBadge variant="info" label="Open" />;
      case 'in_progress':
        return <StatusBadge variant="warning" label="In Progress" />;
      case 'waiting_customer':
        return <StatusBadge variant="purple" label="Waiting on User" />;
      case 'resolved':
        return <StatusBadge variant="success" label="Resolved" />;
      case 'closed':
        return <StatusBadge variant="neutral" label="Closed" />;
      default:
        return <StatusBadge variant="neutral" label={statusVal} />;
    }
  };

  const getPriorityBadge = (priorityVal: string) => {
    switch (priorityVal) {
      case 'critical':
        return <StatusBadge variant="error" label="Critical" />;
      case 'high':
        return <StatusBadge variant="warning" label="High" />;
      case 'medium':
        return <StatusBadge variant="info" label="Medium" />;
      default:
        return <StatusBadge variant="neutral" label="Low" />;
    }
  };

  return (
    <div className="space-y-6 text-left font-sans select-none relative font-display">
      {/* Breadcrumb Header */}
      <div className="space-y-4">
        <button
          onClick={() => router.push('/admin/support')}
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Support Desk
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <SectionHeader
            title="Ticket Details"
            subtitle={`Ticket number: ${ticket.ticket_number}`}
          />
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {getPriorityBadge(ticket.priority)}
            {getStatusBadge(ticket.status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat / Conversation thread */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Conversation Log</h3>
              <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase font-mono">{ticket.messages?.length ?? 0} messages</span>
            </div>

            {/* Original description card */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
              <span className="text-[8px] font-extrabold text-[#005B63] uppercase tracking-widest">Original Issue Statement</span>
              <h4 className="text-xs font-black text-slate-800">{ticket.subject}</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">{ticket.description}</p>
            </div>

            {/* Conversation list */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 border border-slate-50 rounded-xl p-4 bg-slate-50/20">
              {ticket.messages && ticket.messages.map((m, idx) => {
                const isAdmin = m.sender_role.toLowerCase() === 'admin';
                return (
                  <div key={m.id || idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{m.sender_name}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                        isAdmin ? 'bg-[#005B63]/10 text-[#005B63]' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {m.sender_role}
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl max-w-md text-xs font-semibold ${
                      isAdmin ? 'bg-[#005B63] text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-line">{m.message}</p>
                      {m.attachment && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          <a
                            href={m.attachment_url || m.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold underline hover:opacity-85"
                          >
                            <Paperclip className="w-3.5 h-3.5" /> View Attachment
                          </a>
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1">
                      {new Date(m.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Helpdesk Reply form */}
          {ticket.status !== 'closed' ? (
            <form onSubmit={handleReplySubmit} className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Send Helpdesk Message</label>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type reply message to user..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#005B63] resize-none"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setReplyAttachment(file);
                    }}
                  />
                  <button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 cursor-pointer bg-white">
                    <Paperclip className="w-3.5 h-3.5" />
                    {replyAttachment ? replyAttachment.name : 'Attach File'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={replyLoading}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white cursor-pointer transition-all hover:bg-[#004b52] disabled:opacity-50 inline-flex items-center gap-1"
                  style={{ background: '#005B63' }}
                >
                  <Send className="w-3 h-3" />
                  {replyLoading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs font-semibold text-slate-400">
              This support ticket has been closed. No further communications are permitted.
            </div>
          )}
        </div>

        {/* Sidebar Info & Admin Actions */}
        <div className="space-y-6">
          {/* Status & Actions Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">Helpdesk Control</h3>

            {/* Audit Notes field */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Timeline Audit Notes (Optional)</label>
              <textarea
                rows={2}
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                placeholder="Notes logged inside timeline for this action..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#005B63] resize-none"
              />
            </div>

            <div className="space-y-3 pt-1">
              {/* Assign Admin */}
              <div>
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Assign Ticket Owner</label>
                <div className="relative">
                  <select
                    value={ticket.assigned_admin || ''}
                    onChange={e => handleAction('assign', { assigned_admin: e.target.value })}
                    className="w-full appearance-none px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#005B63]"
                  >
                    <option value="">— Unassigned —</option>
                    {admins.map(adm => (
                      <option key={adm.id} value={adm.id}>{adm.full_name} ({adm.role})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Change Priority</label>
                  <div className="relative">
                    <select
                      value={ticket.priority}
                      onChange={e => handleAction('change_priority', { priority: e.target.value })}
                      className="w-full appearance-none px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Change Status</label>
                  <div className="relative">
                    <select
                      value={ticket.status}
                      onChange={e => handleAction('change_status', { status: e.target.value })}
                      className="w-full appearance-none px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-[#005B63]"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_customer">Waiting on User</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => handleAction('resolve', {})}
                  className="w-full py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Resolved
                </button>
              )}

              {ticket.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => handleAction('close', {})}
                  className="w-full py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <XCircle className="w-4 h-4" /> Close Ticket
                </button>
              )}
            </div>
          </div>

          {/* User Details Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100">User Information</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  {ticket.customer_detail.role === 'dealer' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">{ticket.customer_detail.full_name}</h4>
                  <span className="text-[8px] bg-slate-200 text-slate-500 px-1.5 py-0.2 rounded font-extrabold uppercase">{ticket.customer_detail.role}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50 space-y-2">
                <div>
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Email Address</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{ticket.customer_detail.email}</p>
                </div>

                {ticket.related_order && ticket.order_detail && (
                  <div>
                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Related Order</span>
                    <p className="text-xs font-bold text-[#005B63] mt-0.5">Order #{ticket.order_detail.order_number}</p>
                  </div>
                )}

                {ticket.related_product && ticket.product_detail && (
                  <div>
                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Related Product</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{ticket.product_detail.name}</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.2">SKU: {ticket.product_detail.sku}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Timeline Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-xs">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 font-display">Timeline History</h3>
            {ticket.timeline && ticket.timeline.length > 0 ? (
              <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-4">
                {ticket.timeline.map((evt: any, idx: number) => (
                  <div key={evt.id || idx} className="relative">
                    <div className="absolute -left-[21.5px] top-1 w-2 h-2 rounded-full bg-[#005B63]" />
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-800 text-[10px]">{evt.action}</span>
                        <span className="text-[8px] text-slate-400 font-medium">
                          {new Date(evt.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {evt.performed_by_name && (
                        <p className="text-[8px] text-[#005B63] font-bold">
                          By {evt.performed_by_name} ({evt.performed_by_role})
                        </p>
                      )}
                      {evt.notes && (
                        <p className="text-[9px] text-slate-400 leading-relaxed font-sans">{evt.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400">No events logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportDetailPage;
