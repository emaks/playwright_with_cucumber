package io.materialspace.framework.lifecycle;

public final class Cleanup {
    private Cleanup() {
    }

    public static void run(Runnable... actions) {
        RuntimeException failure = null;
        for (Runnable action : actions) {
            try {
                action.run();
            } catch (RuntimeException exception) {
                if (failure == null) {
                    failure = exception;
                } else if (failure != exception) {
                    failure.addSuppressed(exception);
                }
            }
        }
        if (failure != null) {
            throw failure;
        }
    }
}
