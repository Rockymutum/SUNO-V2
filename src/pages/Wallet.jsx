import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Plus, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, History, CreditCard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { formatDistanceToNow } from 'date-fns'

export default function Wallet() {
    const navigate = useNavigate()
    const { user } = useAuth()

    const { data: walletData, isLoading: walletLoading } = useQuery({
        queryKey: ['wallet', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('wallet_balance, min_credit_limit')
                .eq('id', user.id)
                .single()
            if (error) throw error
            return data
        },
        enabled: !!user
    })

    const { data: transactions = [], isLoading: historyLoading } = useQuery({
        queryKey: ['transactions', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
            if (error) throw error
            return data
        },
        enabled: !!user
    })

    const balance = walletData?.wallet_balance || 0
    const limit = walletData?.min_credit_limit || -200

    // Calculate progress for credit limit visual
    // If balance is negative, how close to limit?
    // Limit -200. Balance -50.
    const creditUsage = balance < 0 ? Math.min(100, (Math.abs(balance) / Math.abs(limit)) * 100) : 0

    return (
        <div className="bg-gray-50 min-h-[100dvh] pb-safe">
            {/* Header */}
            <div className="bg-white p-4 pt-safe sticky top-0 z-30 flex items-center gap-4 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold">My Wallet</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Main Balance Card */}
                <div className="relative overflow-hidden rounded-2xl bg-black text-white p-6 shadow-xl shadow-gray-200">
                    <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-white/10 rounded-full backdrop-blur-md">
                            <WalletIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">Total Balance</p>
                            <h2 className={`text-4xl font-bold tracking-tight ${balance < 0 ? 'text-red-400' : 'text-white'}`}>
                                ₹{balance.toFixed(2)}
                            </h2>
                        </div>

                        {/* Credit Limit Info */}
                        <div className="w-full bg-white/10 rounded-xl p-3 flex items-center justify-between text-sm">
                            <span className="text-white/70">Credit Limit</span>
                            <span className="font-mono font-bold">₹{limit}</span>
                        </div>

                        {/* Usage Bar (Only if negative) */}
                        {balance < 0 && (
                            <div className="w-full space-y-2">
                                <div className="flex justify-between text-xs text-red-300">
                                    <span>Credit Used</span>
                                    <span>{creditUsage.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 transition-all duration-500"
                                        style={{ width: `${creditUsage}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <Button
                            className="w-full bg-white text-black hover:bg-gray-100 mt-2 font-bold"
                            onClick={() => alert("Payment Gateway Integration Coming Soon!")}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Money
                        </Button>
                    </div>
                </div>

                {/* Transactions History */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Recent Transactions
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {transactions.length > 0 ? (
                            transactions.map((tx) => (
                                <div key={tx.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-full ${tx.type === 'REFUND' || tx.type === 'RECHARGE' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {tx.type === 'REFUND' || tx.type === 'RECHARGE' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{tx.description || tx.type}</p>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No transactions yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
