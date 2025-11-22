# Frontend Application

## Environment Configuration

The frontend application uses the `VITE_ARTHUR_URL` environment variable to configure the backend API URL.

### Setting the Environment Variable

#### Local Development

Create a `.env` file in the `apps/frontend` directory:

```env
VITE_ARTHUR_URL=http://localhost:8080
```

#### Docker Compose

The environment variable is already configured in `infra/docker-compose.yml`:

```yaml
environment:
  - VITE_ARTHUR_URL=http://backend:8080
```

#### Production

Set the environment variable when building or running the application:

```bash
export VITE_ARTHUR_URL=https://your-backend-url.com
pnpm build
```

Or pass it directly to the build command:

```bash
VITE_ARTHUR_URL=https://your-backend-url.com pnpm build
```

### Default Value

If `VITE_ARTHUR_URL` is not set, the application defaults to `http://localhost:8080`.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:5173`.

