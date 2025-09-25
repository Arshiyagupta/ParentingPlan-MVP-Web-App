import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="container-narrow text-center">
        {/* Logo/Wordmark */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            SafeTalk
          </h1>
        </div>

        {/* Main Heading */}
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 mb-6">
          A calmer way to co-parent
        </h1>

        {/* Subcopy */}
        <p className="text-slate-700 text-lg mb-12 leading-relaxed">
          A simple, turn-based approach that helps co-parents rebuild trust by alternating rounds of sharing good qualities about each other, one step at a time.
        </p>

        {/* Primary CTA */}
        <div className="space-y-4">
          <Link href="/signup">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Get started
            </Button>
          </Link>

          {/* Secondary link */}
          <p className="text-slate-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-safetalk-green hover:text-safetalk-green-hover font-semibold"
            >
              Log in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex justify-center space-x-8 text-sm text-slate-500">
            <button className="hover:text-slate-700">Terms</button>
            <button className="hover:text-slate-700">Privacy</button>
          </div>
        </div>
      </div>
    </div>
  )
}