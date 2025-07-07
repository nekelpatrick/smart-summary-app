# Vercel Deployment Instructions

## Environment Variables

Set these in your Vercel dashboard under Project Settings > Environment Variables:

```
NEXT_PUBLIC_API_URL=http://177.71.137.52:8000
```

## Deployment Steps

1. **Connect Repository**:

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `apps/frontend` directory as the root

2. **Configure Build Settings**:

   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Set Environment Variables**:

   - Add `NEXT_PUBLIC_API_URL=http://177.71.137.52:8000`

4. **Deploy**:
   - Click "Deploy"
   - Your app will be available at `https://your-app.vercel.app`

## Custom Domain (Optional)

If you want to use `pastetosummary.com`:

1. Go to Project Settings > Domains
2. Add `pastetosummary.com`
3. Update your DNS to point to Vercel

## Backend Configuration

The backend on EC2 is already configured to accept requests from any origin.
Make sure the backend is running on `177.71.137.52:8000`.
