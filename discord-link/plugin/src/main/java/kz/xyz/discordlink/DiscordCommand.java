package kz.xyz.discordlink;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

import java.util.List;
import java.util.Locale;

/** /discord — начать привязку; /discord unlink — отвязать; /discord cancel; админам: reload, resync. */
public final class DiscordCommand implements CommandExecutor, TabCompleter {

    private final DiscordLinkPlugin plugin;

    public DiscordCommand(DiscordLinkPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command cmd, @NotNull String label, @NotNull String[] args) {
        String sub = args.length > 0 ? args[0].toLowerCase(Locale.ROOT) : "";

        if (sub.equals("reload") || sub.equals("resync")) {
            if (!sender.hasPermission("xyzdiscord.admin")) {
                plugin.send(sender, "no-permission");
                return true;
            }
            if (sub.equals("reload")) {
                plugin.reload();
                plugin.send(sender, "reloaded");
            } else {
                plugin.groupSync().resyncOnline();
                plugin.send(sender, "resynced");
            }
            return true;
        }

        if (!(sender instanceof Player player)) {
            plugin.send(sender, "players-only");
            return true;
        }
        String uuid = player.getUniqueId().toString();

        switch (sub) {
            case "cancel" -> {
                plugin.capture().cancel(player);
                plugin.send(player, "cancelled");
            }
            case "unlink" -> plugin.bot().unlink(uuid).whenComplete((res, err) -> {
                if (err != null) plugin.send(player, "error");
                else if (res.ok()) plugin.send(player, "unlinked");
                else if (res.status() == 404) plugin.send(player, "not-linked");
                else plugin.send(player, "error");
            });
            default -> plugin.bot().status(uuid).whenComplete((res, err) -> {
                if (err != null || (!res.ok())) {
                    plugin.send(player, "error");
                } else if (res.linked()) {
                    plugin.send(player, "already-linked");
                } else {
                    plugin.capture().begin(player);
                    plugin.send(player, "enter-code");
                }
            });
        }
        return true;
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command cmd, @NotNull String alias, @NotNull String[] args) {
        if (args.length != 1) return List.of();
        List<String> opts = sender.hasPermission("xyzdiscord.admin")
                ? List.of("unlink", "cancel", "reload", "resync")
                : List.of("unlink", "cancel");
        return opts.stream().filter(s -> s.startsWith(args[0].toLowerCase(Locale.ROOT))).toList();
    }
}
