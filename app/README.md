# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Reel Georgia frontend

The app uses the existing FastAPI service. No frontend-owned database, mock
predictions, or replacement backend routes are used.

| Screen | Backend API |
| --- | --- |
| Sign in | `GET /auth/me` with `X-Username` |
| Create account | Check `/auth/me`, then `POST /auth/login` |
| Species browser | `GET /species` |
| Photo identification | `POST /predict?top_k=3`, multipart `file` |
| Confirm catch | `POST /catches`, `species`, `weight_lbs`, `length_inches` |
| Fishing history | `GET /catches` with `X-Username` |

Usernames use the frontend's requested letters/underscores/spaces validation.
The current backend rejects spaces, so spaces need backend-team support before
those usernames can be created. Existing names containing digits/hyphens can be
used for sign-in. Account creation checks for existing users first, but the backend's
create-or-reuse endpoint cannot guarantee exclusive registration during a race.

The five team-provided `IMG_*.png` photos in `assets/images` are the demo choices.
There is currently no demo-photo API on main. Expo serves those assets; selections
are resized and converted to JPEG on-device and sent to the real ML endpoint,
exactly like camera/library photos. There are no hardcoded identifications.

History displays the server's saved catch records and measurements. The current
backend does not store photos. The session is in memory; reopening the app asks
for your username again, while catches remain in the backend database.

Start your backend using its README, then start the frontend:

```bash
cd app
npm ci
npx expo start
```

The app defaults to port 8000 on the Expo development host (or browser hostname).
Set `EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_HOST:8000` in `app/.env.local` to override
it, and restart Expo. A physical phone must be able to reach that host. Expo's
tunnel does not tunnel the backend. Browser use requires the backend to allow the
frontend origin with CORS; main currently has no CORS configuration. Native apps
do not require browser CORS. Hosted web deployments need an HTTPS backend URL.

The first real identification may take several minutes to download and initialize
BioCLIP. Backend ML dependencies and model access are managed by the backend team.
Camera/library handling follows the Expo SDK 58 image-picker documentation; verify
native camera permissions on a physical device.
