package kz.xyz.discordlink;

import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Перехватывает следующее сообщение игрока после /discord как код привязки: сообщение отменяется ещё на
 * LOWEST-приоритете и убирается у всех получателей, поэтому в общем чате его никто не видит.
 */
public final class CodeCapture implements Listener {

    private final DiscordLinkPlugin plugin;
    private final Map<UUID, Long> waiting = new ConcurrentHashMap<>(); // игрок -> время истечения (мс)

    public CodeCapture(DiscordLinkPlugin plugin) {
        this.plugin = plugin;
    }

    public void begin(Player player) {
        long ttl = Math.max(10, plugin.getConfig().getLong("code-timeout-seconds", 120)) * 1000;
        waiting.put(player.getUniqueId(), System.currentTimeMillis() + ttl);
    }

    public boolean cancel(Player player) {
        return waiting.remove(player.getUniqueId()) != null;
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onChat(AsyncChatEvent event) {
        Player player = event.getPlayer();
        Long until = waiting.remove(player.getUniqueId());
        if (until == null) return;

        // Прячем сообщение при любом исходе, даже если время вышло: это мог быть код
        event.setCancelled(true);
        event.viewers().clear();

        if (System.currentTimeMillis() > until) {
            plugin.send(player, "timeout");
            return;
        }
        String text = PlainTextComponentSerializer.plainText().serialize(event.originalMessage()).trim();
        if (text.equalsIgnoreCase("cancel") || text.equalsIgnoreCase("отмена")) {
            plugin.send(player, "cancelled");
            return;
        }
        plugin.bot().link(text, player.getUniqueId().toString(), player.getName()).whenComplete((res, err) -> {
            if (err != null) {
                plugin.getLogger().warning("Бот недоступен: " + err.getMessage());
                plugin.send(player, "error");
            } else if (res.ok()) {
                plugin.send(player, "linked-ok");
                plugin.groupSync().schedule(player.getUniqueId());
            } else {
                plugin.send(player, switch (res.error()) {
                    case "invalid_code" -> "invalid-code";
                    case "too_many_attempts" -> "too-many";
                    case "already_linked" -> "already-linked";
                    default -> "error";
                });
            }
        });
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        waiting.remove(event.getPlayer().getUniqueId());
    }
}
