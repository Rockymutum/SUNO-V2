import { Wrench, Zap, Truck, Paintbrush, Home, Sparkles, HeartHandshake, Car, ChefHat, Sprout, Laptop, Briefcase } from 'lucide-react'

export const CATEGORIES = [
    { id: 'plumbing', name: 'Plumbing', icon: Wrench, color: 'text-blue-500' },
    { id: 'electrical', name: 'Electrical', icon: Zap, color: 'text-amber-500' },
    { id: 'moving', name: 'Moving', icon: Truck, color: 'text-emerald-500' },
    { id: 'cleaning', name: 'Cleaning', icon: Home, color: 'text-cyan-500' },
    { id: 'painting', name: 'Painting', icon: Paintbrush, color: 'text-purple-500' },
    { id: 'house_keeping', name: 'House Keeping', icon: Sparkles, color: 'text-rose-500' },
    { id: 'caretaker', name: 'Caretaker', icon: HeartHandshake, color: 'text-pink-500' },
    { id: 'driver', name: 'Driver', icon: Car, color: 'text-slate-500' },
    { id: 'cook', name: 'Cook', icon: ChefHat, color: 'text-orange-500' },
    { id: 'gardener', name: 'Gardener', icon: Sprout, color: 'text-lime-500' },
    { id: 'developer', name: 'Developer', icon: Laptop, color: 'text-indigo-500' },
    { id: 'others', name: 'Others', icon: Briefcase, color: 'text-gray-500' }
]

// Support User ID (Admin/Support Agent)
export const SUPPORT_USER_ID = '80c96cd5-a336-4f4c-8c76-e2ba5c544ce7'
