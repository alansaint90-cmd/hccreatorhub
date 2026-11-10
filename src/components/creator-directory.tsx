"use client";
import { useState } from "react";
import { ArrowUpRight, ExternalLink, ImageIcon, Mail, MapPin, Search } from "lucide-react";
import type { Workspace } from "@/lib/queries";
import { date } from "@/lib/format";
import { supportMaterialsSchema } from "@/lib/validators";
import { Badge, Button, Empty, Modal, Pagination } from "./ui";
import { CampaignImage } from "./campaign-image";
type Creator = Workspace["creators"][number];

function CreatorAvatar({ creator }: { creator: Creator }) {
  return (
    <span className="avatar creator-avatar">
      {creator.profile.photoUrl ? (
        <CampaignImage src={creator.profile.photoUrl} title={`Foto de ${creator.name}`} />
      ) : (
        creator.name[0]
      )}
    </span>
  );
}
export function CreatorDirectory({ creators }: { creators: Creator[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Creator | null>(null);
  const rows = creators.filter((c) =>
    (c.name + " " + c.profile.niche + " " + c.profile.city).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="filter-bar">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Buscar creator, nicho ou cidade"
            placeholder="Buscar creator, nicho ou cidade"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <span className="result-count">{rows.length} creators</span>
      </div>
      <div className="table-panel creator-list">
        {rows.length ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Nicho / cidade</th>
                  <th>Seguidores</th>
                  <th>Engajamento</th>
                  <th>Perfil</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 15, page * 15).map((creator) => (
                  <tr key={creator.id} onClick={() => setSelected(creator)}>
                    <td>
                      <button className="creator-name-button" onClick={() => setSelected(creator)}>
                        <CreatorAvatar creator={creator} />
                        <span>
                          <strong>{creator.name}</strong>
                          <small>{creator.profile.instagram || "Perfil social não informado"}</small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Nicho / cidade">
                      <strong>{creator.profile.niche || "Nicho não informado"}</strong>
                      <small>{creator.profile.city || "Cidade não informada"}</small>
                    </td>
                    <td data-label="Seguidores">
                      {creator.profile.followers ? Number(creator.profile.followers).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td data-label="Engajamento">
                      {creator.profile.engagement ? creator.profile.engagement + "%" : "—"}
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        aria-label={`Ver perfil de ${creator.name}`}
                        onClick={() => setSelected(creator)}
                      >
                        Ver perfil
                        <ArrowUpRight size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={rows.length} onPage={setPage} />
          </>
        ) : (
          <Empty
            filtered={!!query}
            onClear={() => {
              setQuery("");
              setPage(1);
            }}
          />
        )}
      </div>
      {selected && <CreatorProfile creator={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
function CreatorProfile({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const p = creator.profile;
  const images = (p.portfolioImages ?? "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  const links = supportMaterialsSchema.safeParse(p.mediaLinks ?? "");
  return (
    <Modal title={creator.name} description="Perfil e portfólio do creator" onClose={onClose}>
      <div className="creator-profile-header">
        <CreatorAvatar creator={creator} />
        <div>
          <Badge>{p.niche || "Nicho não informado"}</Badge>
          <p>
            <MapPin size={14} />
            {p.city || "Cidade não informada"}
          </p>
          <p>
            <Mail size={14} />
            {creator.email}
          </p>
        </div>
      </div>
      <section className="creator-profile-section">
        <h3>Sobre o creator</h3>
        <p>{p.bio || "Este creator ainda não adicionou uma apresentação."}</p>
      </section>
      <dl className="creator-profile-metrics">
        <div>
          <dt>Seguidores</dt>
          <dd>{p.followers ? Number(p.followers).toLocaleString("pt-BR") : "—"}</dd>
        </div>
        <div>
          <dt>Engajamento</dt>
          <dd>{p.engagement ? p.engagement + "%" : "—"}</dd>
        </div>
        <div>
          <dt>Referência</dt>
          <dd>{p.metricsDate ? date(p.metricsDate) : "—"}</dd>
        </div>
      </dl>
      <p className="field-help">Métricas informadas pelo creator, sem verificação automática.</p>
      <section className="creator-profile-section">
        <h3>Redes e portfólio</h3>
        <p>{p.instagram || "Perfil social não informado"}</p>
        {p.portfolio ? (
          <a className="text-link" href={p.portfolio} target="_blank" rel="noopener noreferrer">
            Abrir portfólio
            <ExternalLink size={15} />
          </a>
        ) : (
          <p className="muted">Link de portfólio não informado.</p>
        )}
      </section>
      <section className="creator-profile-section">
        <h3>Imagens do portfólio</h3>
        {images.length ? (
          <div className="creator-gallery">
            {images.map((url, index) => (
              <a
                key={`${url}-${index}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir imagem ${index + 1} do portfólio`}
              >
                <CampaignImage src={url} title={`Portfólio de ${creator.name}, imagem ${index + 1}`} />
              </a>
            ))}
          </div>
        ) : (
          <div className="creator-no-media">
            <ImageIcon size={22} />
            Nenhuma imagem cadastrada.
          </div>
        )}
      </section>
      <section className="creator-profile-section">
        <h3>Vídeos e materiais</h3>
        {links.success && links.data.length ? (
          <div className="creator-material-links">
            {links.data.map((link, index) => (
              <a
                className="text-link"
                key={`${link.url}-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.title}
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum material adicional cadastrado.</p>
        )}
      </section>
    </Modal>
  );
}
