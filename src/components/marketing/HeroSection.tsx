import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function HeroSection() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 md:px-8">
      <p className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
        Salam Sourcing Marketplace
      </p>
      <div className="space-y-4">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
          Discover and source trusted wholesale suppliers worldwide.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Built for modern B2B trade teams inspired by experiences like go4worldbusiness and Faire.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <a className={buttonVariants({ size: 'lg' })} href="/marketplace">
          Explore Marketplace
        </a>
        <a className={cn(buttonVariants({ size: 'lg', variant: 'secondary' }))} href="/login">
          Sign In
        </a>
      </div>
    </section>
  );
}
