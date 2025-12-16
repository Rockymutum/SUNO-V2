import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Star, MapPin, Briefcase } from 'lucide-react'
import { Link } from 'react-router-dom'

export function WorkerCard({ worker }) {
    const { id, name, title, rating, reviews_count, rate, location, avatar, skills = [] } = worker

    return (
        <Card className="p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div className="flex gap-3">
                    <Avatar src={avatar} alt={name} size="md" />
                    <div>
                        <h3 className="font-bold text-sm text-primary">{name}</h3>
                        <p className="text-xs text-muted mb-1">{title}</p>
                        <div className="flex items-center gap-1 text-xs font-medium">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span>{rating}</span>
                            <span className="text-gray-400">({reviews_count})</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold text-sm">₹{rate}/hr</p>
                    <p className="text-[10px] text-muted">starting</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-1">
                {skills.slice(0, 3).map((skill, i) => (
                    <Badge key={i} variant="default" className="text-[10px] py-0 px-2 h-5 bg-slate-50">{skill}</Badge>
                ))}
                {skills.length > 3 && <span className="text-[10px] text-gray-400 self-center">+{skills.length - 3}</span>}
            </div>

            <div className="flex items-center text-xs text-gray-500 gap-2 mt-1">
                <MapPin size={12} /> {location}
            </div>

            <Link to={`/worker/${id}`} className="mt-1">
                <Button variant="secondary" size="sm" className="w-full">View Profile</Button>
            </Link>
        </Card>
    )
}
