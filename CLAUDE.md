1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, ask clarifying questions, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to todo.md. If this file doesn't exist, create it.

# build-optimization
For faster Xcode builds:
- Use `flutter run` for development instead of Xcode builds when possible
- Only use Xcode for iOS-specific debugging
- Avoid cleaning build unless necessary - incremental builds are much faster
- Clear Derived Data periodically: Xcode → Preferences → Locations → Derived Data → Delete
- The project is optimized with: incremental Swift compilation, disabled indexing store, and build active architecture only for debug builds